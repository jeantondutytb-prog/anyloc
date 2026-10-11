"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { track } from "@/lib/analytics/track";

type InstallState =
  | { kind: "not_started" }
  | { kind: "awaiting_udid" }
  | { kind: "preparing" }
  | { kind: "ready"; buildId: string }
  | { kind: "failed"; message: string };

type StatusResponse =
  | { eligible: false }
  | { eligible: true; state: InstallState; installUrl: string | null };

const POLL_MS = 5000;

// Seul Safari sait installer un profil .mobileconfig. Les navigateurs intégrés
// (Gmail, app Google, Instagram…) n'ont pas le jeton « Version/ » de Safari.
function isIphoneSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPhone|iPad/.test(ua) &&
    /Version\/[\d.]+.*Safari\//.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|FBAN|FBAV|Instagram/.test(ua)
  );
}

const noSubscribe = () => () => {};

export function IphoneInstallView({ embedded = false }: { embedded?: boolean } = {}) {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const onIphone = useSyncExternalStore(noSubscribe, isIphoneSafari, () => false);
  const pageUrl = useSyncExternalStore(
    noSubscribe,
    () => `${window.location.origin}/dashboard`,
    () => ""
  );

  const load = useCallback(async () => {
    const response = await fetch("/api/ios/status", { cache: "no-store" });
    if (response.ok) setStatus((await response.json()) as StatusResponse);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ios/status", { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<StatusResponse>) : null))
      .then((data) => {
        if (!cancelled && data) setStatus(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const kind = status?.eligible ? status.state.kind : null;

  useEffect(() => {
    if (kind !== "awaiting_udid" && kind !== "preparing") return;
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [kind, load]);

  const callbackFailed = searchParams.get("etape") === "erreur";

  // One event per step reached: shows where the iPhone install funnel leaks
  // (not eligible, wrong browser, stuck on the profile, build failures…).
  useEffect(() => {
    if (!status) return;
    track("iphone_install_state", {
      state: status.eligible ? status.state.kind : "not_eligible",
      in_safari: onIphone,
      callback_failed: callbackFailed,
      error: status.eligible && status.state.kind === "failed" ? status.state.message : undefined,
    });
  }, [status?.eligible, kind, onIphone, callbackFailed]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={
        embedded
          ? "flex flex-col gap-4"
          : "mx-auto flex min-h-screen max-w-lg flex-col gap-4 bg-background p-6"
      }
    >
      {!embedded && (
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">L&apos;app Anyloc sur ton iPhone</h1>
            <p className="text-sm text-zinc-600">Sans ordi, sans câble. Valable 1 an.</p>
          </div>
        </div>
      )}

      {!status && (
        <Card className="flex items-center gap-2 p-6 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </Card>
      )}

      {status && !status.eligible && (
        <Card className="p-6 text-sm text-zinc-700">
          L&apos;app iPhone est incluse dans la <strong>formule 1 an</strong>. Passe à la formule 1 an
          depuis ton compte pour l&apos;installer.
        </Card>
      )}

      {status?.eligible && !onIphone && (
        <Card className="flex flex-col items-center gap-3 p-6 text-center text-sm text-zinc-700">
          <p>
            Ouvre cette page <strong>dans Safari</strong> pour installer l&apos;app :
          </p>
          {pageUrl && (
            <>
              <p className="font-semibold text-zinc-900">{pageUrl.replace(/^https?:\/\//, "")}</p>
              <Button
                type="button"
                data-track="iphone_install_link_copied"
                onClick={() => {
                  void navigator.clipboard.writeText(pageUrl).then(() => setCopied(true));
                }}
              >
                {copied ? "Lien copié — colle-le dans Safari" : "Copier le lien"}
              </Button>
            </>
          )}
        </Card>
      )}

      {status?.eligible && onIphone && (
        <Card className="flex flex-col gap-4 p-6 text-sm text-zinc-700">
          {callbackFailed && status.state.kind === "not_started" && (
            <p className="rounded-xl bg-red-50 p-3 text-red-700">
              L&apos;étape n&apos;a pas abouti. Recommence depuis le bouton ci-dessous.
            </p>
          )}

          {status.state.kind === "not_started" && (
            <>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Appuie sur le bouton, puis sur <strong>Autoriser</strong>.</li>
                <li>Ouvre <strong>Réglages</strong> → <strong>Profil téléchargé</strong> → <strong>Installer</strong>.</li>
                <li>Reviens ici : on prépare ton app (2 à 5 minutes).</li>
              </ol>
              <Button
                data-track="iphone_install_enroll_clicked"
                // A real page load: the route answers with the profile file Safari installs.
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                onClick={() => { window.location.href = "/api/ios/enroll"; }}
              >
                Préparer mon iPhone
              </Button>
            </>
          )}

          {status.state.kind === "awaiting_udid" && (
            <p className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ouvre <strong>Réglages</strong> → <strong>Profil téléchargé</strong> → <strong>Installer</strong>, puis reviens ici.
            </p>
          )}

          {status.state.kind === "preparing" && (
            <p className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ton iPhone est enregistré. On prépare ton app… (2 à 5 minutes, garde cette page ouverte)
            </p>
          )}

          {status.state.kind === "ready" && status.installUrl && (
            <>
              <p className="flex items-center gap-2 font-semibold text-emerald-700">
                <CheckCircle2 className="h-5 w-5" /> Ton app est prête.
              </p>
              <Button
                data-track="iphone_install_app_clicked"
                onClick={() => { window.location.href = status.installUrl!; }}
              >
                Installer Anyloc
              </Button>
              <p className="text-xs text-zinc-500">
                Appuie sur « Installer » dans la fenêtre qui s&apos;ouvre. L&apos;icône apparaît sur ton écran d&apos;accueil.
              </p>
            </>
          )}

          {status.state.kind === "failed" && (
            <>
              <p className="rounded-xl bg-red-50 p-3 text-red-700">{status.state.message}</p>
              <Button
                data-track="iphone_install_enroll_clicked"
                data-track-retry="true"
                // A real page load: the route answers with the profile file Safari installs.
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                onClick={() => { window.location.href = "/api/ios/enroll"; }}
              >
                Réessayer
              </Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
