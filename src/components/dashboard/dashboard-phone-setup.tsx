"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Monitor,
  QrCode,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SetupQrCode } from "@/components/dashboard/setup-qr-code";
import { useDownloads } from "@/hooks/use-downloads";
import type { DeviceItem } from "@/hooks/use-device-status";
import {
  buildMobileSetupLink,
  buildSetupDesktopLink,
  getPendingTokenStorageKey,
  getPublicApiBaseUrl,
} from "@/lib/device-setup-link";
import { cn } from "@/lib/utils";

type Platform = "ios" | "android";

type CreatedToken = {
  token: string;
  platform: Platform;
  apiBaseUrl: string;
};

type DashboardPhoneSetupProps = {
  devices: DeviceItem[];
  phoneOnline: boolean;
  onLinked?: () => void;
  compact?: boolean;
};

export function DashboardPhoneSetup({
  devices,
  phoneOnline,
  onLinked,
  compact = false,
}: DashboardPhoneSetupProps) {
  const [platform, setPlatform] = useState<Platform>("ios");
  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<CreatedToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { data: downloads, loading: downloadsLoading } = useDownloads();

  const linkedForPlatform = devices.find((device) => device.platform === platform);

  const createToken = useCallback(async () => {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          deviceName: platform === "android" ? "Mon Android" : "Mon iPhone",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de créer le code.");
      }

      const nextToken: CreatedToken = {
        token: data.token,
        platform,
        apiBaseUrl: data.apiBaseUrl ?? getPublicApiBaseUrl(),
      };

      sessionStorage.setItem(
        getPendingTokenStorageKey(platform),
        JSON.stringify(nextToken)
      );
      setCreatedToken(nextToken);
      onLinked?.();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Impossible de créer le code."
      );
    } finally {
      setCreating(false);
    }
  }, [onLinked, platform]);

  useEffect(() => {
    if (phoneOnline || linkedForPlatform) {
      return;
    }

    const cached = sessionStorage.getItem(getPendingTokenStorageKey(platform));

    if (cached) {
      try {
        const parsed = JSON.parse(cached) as CreatedToken;
        if (parsed.token?.startsWith("anyloc_")) {
          setCreatedToken(parsed);
          return;
        }
      } catch {
        sessionStorage.removeItem(getPendingTokenStorageKey(platform));
      }
    }

    void createToken();
  }, [createToken, linkedForPlatform, phoneOnline, platform]);

  const mobileSetupLink = useMemo(() => {
    if (!createdToken) {
      return null;
    }

    return buildMobileSetupLink(createdToken.token, createdToken.apiBaseUrl);
  }, [createdToken]);

  const setupDesktopLink = useMemo(() => {
    if (!createdToken) {
      return null;
    }

    return buildSetupDesktopLink(createdToken.token, createdToken.apiBaseUrl);
  }, [createdToken]);

  const setupDownload = downloads?.assets.find((asset) =>
    platform === "ios"
      ? asset.id === "setup-mac" || asset.id === "setup-win"
      : asset.id === "apk"
  );

  const copyToken = async () => {
    if (!createdToken) {
      return;
    }

    await navigator.clipboard.writeText(createdToken.token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (phoneOnline) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-emerald-900">
            Téléphone connecté
          </p>
          <p className="text-xs text-emerald-700/90">
            Choisis une ville ou clique sur la carte — ta loc se met à jour toute
            seule.
          </p>
        </div>
      </div>
    );
  }

  if (linkedForPlatform) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Ouvre Anyloc sur ton téléphone</p>
          <p className="mt-1 text-xs text-amber-800/90">
            {linkedForPlatform.deviceName} est déjà configuré. Lance l&apos;app sur
            ton tel
            {platform === "ios" ? " (LocalDevVPN connecté)" : ""} pour recevoir ta
            position depuis le dashboard.
          </p>
        </div>
        <Link href={`/dashboard/installation?platform=${platform}`}>
          <Button variant="secondary" size="sm" className="w-full">
            Besoin d&apos;aide ?
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Configuration automatique
        </p>
        <p className="mt-1 text-sm text-zinc-600">
          Ton code est généré tout seul. Installe l&apos;app, scanne le QR — plus
          besoin de copier-coller.
        </p>
      </div>

      <div className="flex gap-2">
        {(["ios", "android"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setPlatform(value);
              setError(null);
              const cached = sessionStorage.getItem(getPendingTokenStorageKey(value));
              if (cached) {
                try {
                  setCreatedToken(JSON.parse(cached) as CreatedToken);
                  return;
                } catch {
                  sessionStorage.removeItem(getPendingTokenStorageKey(value));
                }
              }
              setCreatedToken(null);
            }}
            className={cn(
              "flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
              platform === value
                ? "border-pink-300 bg-pink-50 text-pink-700"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
            )}
          >
            {value === "ios" ? "iPhone" : "Android"}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {creating || !createdToken ? (
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Génération de ton code de liaison…
        </div>
      ) : (
        <div className="space-y-4">
          {platform === "ios" ? (
            <ol className="space-y-3 text-sm text-zinc-600">
              <li className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
                <p className="font-medium text-zinc-900">
                  1. Installe via Anyloc Setup (Mac/PC)
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  {setupDownload?.available ? (
                    <a href={setupDownload.downloadPath} className="flex-1">
                      <Button size="sm" className="w-full">
                        <Download className="h-4 w-4" />
                        Télécharger Setup
                      </Button>
                    </a>
                  ) : (
                    <Link href="/dashboard/installation?platform=ios" className="flex-1">
                      <Button size="sm" variant="secondary" className="w-full">
                        <Download className="h-4 w-4" />
                        {downloadsLoading ? "Chargement…" : "Télécharger Setup"}
                      </Button>
                    </Link>
                  )}
                  {setupDesktopLink ? (
                    <a href={setupDesktopLink} className="flex-1">
                      <Button size="sm" variant="secondary" className="w-full">
                        <Monitor className="h-4 w-4" />
                        Ouvrir Setup (code prérempli)
                      </Button>
                    </a>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Branche ton iPhone en USB → Installe l&apos;app → Envoie le
                  pairing. Setup reçoit ton code automatiquement.
                </p>
              </li>

              <li className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
                <p className="font-medium text-zinc-900">
                  2. Scanne ce QR avec ton iPhone
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Ouvre l&apos;app Anyloc après l&apos;installation — le code se
                  configure tout seul.
                </p>
                {mobileSetupLink ? (
                  <div className="mt-3 flex items-center gap-4">
                    <SetupQrCode
                      value={mobileSetupLink}
                      label="Appareil photo → ouvre Anyloc"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-xs text-zinc-500">
                        Ou copie le code manuellement si besoin :
                      </p>
                      <code className="block break-all rounded-lg bg-white px-2 py-1.5 text-[10px] text-zinc-700">
                        {createdToken.token}
                      </code>
                      <Button size="sm" variant="secondary" onClick={() => void copyToken()}>
                        <Copy className="h-4 w-4" />
                        {copied ? "Copié" : "Copier"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            </ol>
          ) : (
            <ol className="space-y-3 text-sm text-zinc-600">
              <li className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
                <p className="font-medium text-zinc-900">1. Installe l&apos;APK</p>
                <div className="mt-3">
                  {setupDownload?.available ? (
                    <a href={setupDownload.downloadPath}>
                      <Button size="sm">
                        <Download className="h-4 w-4" />
                        Télécharger Anyloc Android
                      </Button>
                    </a>
                  ) : (
                    <Link href="/dashboard/installation?platform=android">
                      <Button size="sm" variant="secondary">
                        <Download className="h-4 w-4" />
                        {downloadsLoading ? "Chargement…" : "Télécharger l'APK"}
                      </Button>
                    </Link>
                  )}
                </div>
              </li>

              <li className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
                <p className="font-medium text-zinc-900">
                  2. Scanne ce QR depuis ton Android
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  L&apos;app s&apos;ouvre avec ton code déjà configuré.
                </p>
                {mobileSetupLink ? (
                  <div className="mt-3 flex items-center gap-4">
                    <SetupQrCode
                      value={mobileSetupLink}
                      label="Caméra → ouvre Anyloc"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <a href={mobileSetupLink}>
                        <Button size="sm" className="w-full">
                          <Smartphone className="h-4 w-4" />
                          Ouvrir Anyloc
                        </Button>
                      </a>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full"
                        onClick={() => void copyToken()}
                      >
                        <Copy className="h-4 w-4" />
                        {copied ? "Copié" : "Copier le code"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            </ol>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={`/dashboard/installation?platform=${platform}`} className="flex-1">
              <Button variant="secondary" size="sm" className="w-full">
                <ExternalLink className="h-4 w-4" />
                Guide complet
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => void createToken()}
              disabled={creating}
            >
              <QrCode className="h-4 w-4" />
              Nouveau code
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
