"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";
import { SetupQrCode } from "@/components/dashboard/setup-qr-code";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

function isIphoneSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

const noSubscribe = () => () => {};

export function IphoneInstallView({ embedded = false }: { embedded?: boolean } = {}) {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusResponse | null>(null);
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

      {status?.eligible && !onIphone && status.state.kind !== "ready" && (
        <Card className="flex flex-col items-center gap-3 p-6 text-center text-sm text-zinc-700">
          <p>Ouvre cette page <strong>dans Safari, sur ton iPhone</strong> :</p>
          {pageUrl && <SetupQrCode value={pageUrl} label="Scanne avec l'appareil photo" />}
        </Card>
      )}

      {status?.eligible && !onIphone && status.state.kind === "ready" && (
        <Card className="flex flex-col items-center gap-3 p-6 text-center text-sm text-zinc-700">
          <p>Ton app est prête : ouvre cette page sur ton iPhone pour l&apos;installer.</p>
          {pageUrl && <SetupQrCode value={pageUrl} label="Scanne avec l'appareil photo" />}
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
              <Button onClick={() => { window.location.href = "/api/ios/enroll"; }}>
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
              <Button onClick={() => { window.location.href = status.installUrl!; }}>
                Installer Anyloc
              </Button>
              <p className="text-xs text-zinc-500">
                Appuie sur « Installer » dans la fenêtre qui s&apos;ouvre. L&apos;icône apparaît sur ton écran d&apos;accueil.
              </p>
            </>
          )}

          {status.state.kind === "failed" && (
            <p className="rounded-xl bg-red-50 p-3 text-red-700">{status.state.message}</p>
          )}
        </Card>
      )}
    </div>
  );
}
