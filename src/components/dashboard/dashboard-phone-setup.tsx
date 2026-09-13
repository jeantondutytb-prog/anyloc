"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Monitor,
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

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") {
    return "ios";
  }

  return /android/i.test(navigator.userAgent) ? "android" : "ios";
}

function detectIsMac() {
  if (typeof navigator === "undefined") {
    return true;
  }

  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

function StepBox({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-500 text-sm font-bold text-white">
          {number}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="font-semibold text-zinc-900">{title}</p>
          <div className="space-y-2 text-sm leading-relaxed text-zinc-600">
            {children}
          </div>
        </div>
      </div>
    </li>
  );
}

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

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const linkedForPlatform = devices.find((device) => device.platform === platform);
  const isMac = detectIsMac();

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
        throw new Error(data.error ?? "Impossible de préparer ton téléphone.");
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
          : "Impossible de préparer ton téléphone."
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
      ? asset.id === (isMac ? "setup-mac" : "setup-win")
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
            C&apos;est bon, ton téléphone est prêt
          </p>
          <p className="text-xs leading-relaxed text-emerald-700/90">
            Clique sur une ville à gauche, ou cherche une adresse en haut, ou tape
            sur la carte. Ta fausse position se met sur ton téléphone toute seule.
          </p>
        </div>
      </div>
    );
  }

  if (linkedForPlatform) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Il ne reste qu&apos;à ouvrir l&apos;app Anyloc</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800/90">
            Ton téléphone est déjà enregistré. Ouvre simplement l&apos;app{" "}
            <strong>Anyloc</strong> sur ton tel et laisse-la ouverte.
            {platform === "ios"
              ? " Sur iPhone, vérifie aussi que l'app LocalDevVPN est bien connectée (bouton vert)."
              : null}
          </p>
        </div>
        <Link href={`/dashboard/installation?platform=${platform}`}>
          <Button variant="secondary" size="sm" className="w-full">
            Je bloque, montre-moi les étapes en détail
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
          Avant de choisir une ville
        </p>
        <p className="mt-1 text-sm leading-relaxed text-zinc-600">
          On prépare ton téléphone. Suis les étapes dans l&apos;ordre — ton code de
          liaison est déjà créé, tu n&apos;as presque rien à taper toi-même.
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
            {value === "ios" ? "J'ai un iPhone" : "J'ai un Android"}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {creating || !createdToken ? (
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Préparation de ton téléphone…
        </div>
      ) : (
        <div className="space-y-4">
          {platform === "ios" ? (
            <ol className="space-y-3">
              <StepBox number={1} title="Sur ton ordinateur (Mac ou PC)">
                <p>
                  Télécharge le programme <strong>Anyloc Setup</strong> — c&apos;est
                  lui qui met l&apos;app sur ton iPhone. Une seule fois.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {setupDownload?.available ? (
                    <a href={setupDownload.downloadPath} className="flex-1">
                      <Button size="sm" className="w-full">
                        <Download className="h-4 w-4" />
                        Télécharger pour {isMac ? "Mac" : "Windows"}
                      </Button>
                    </a>
                  ) : (
                    <Link href="/dashboard/installation?platform=ios" className="flex-1">
                      <Button size="sm" variant="secondary" className="w-full">
                        <Download className="h-4 w-4" />
                        {downloadsLoading ? "Chargement…" : "Télécharger le programme"}
                      </Button>
                    </Link>
                  )}
                  {setupDesktopLink ? (
                    <a href={setupDesktopLink} className="flex-1">
                      <Button size="sm" variant="secondary" className="w-full">
                        <Monitor className="h-4 w-4" />
                        Ouvrir le programme (déjà configuré)
                      </Button>
                    </a>
                  ) : null}
                </div>
                <ol className="list-decimal space-y-1.5 pl-5 text-xs text-zinc-500">
                  <li>Branche ton iPhone avec ton câble de charge</li>
                  <li>Sur l&apos;iPhone, appuie sur <strong>Faire confiance</strong></li>
                  <li>
                    Dans le programme : <strong>Installer l&apos;app sur mon iPhone</strong>
                  </li>
                  <li>
                    Puis : <strong>Connecter mon iPhone à Anyloc</strong> (un seul bouton)
                  </li>
                </ol>
              </StepBox>

              <StepBox number={2} title="Sur ton iPhone — lie l'app à ton compte">
                <p>
                  Ouvre l&apos;appareil photo et pointe vers le carré ci-dessous.
                  Appuie sur la notification → l&apos;app Anyloc s&apos;ouvre et c&apos;est
                  réglé.
                </p>
                {mobileSetupLink ? (
                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                    <SetupQrCode
                      value={mobileSetupLink}
                      label="Scanne avec l'appareil photo"
                    />
                    <p className="text-xs text-zinc-500 sm:max-w-[200px]">
                      Ensuite, laisse l&apos;app <strong>Anyloc</strong> ouverte sur ton
                      iPhone. Tu peux débrancher le câble.
                    </p>
                  </div>
                ) : null}
              </StepBox>

              <StepBox number={3} title="Une fois par semaine sur iPhone (2 min)">
                <p className="text-xs text-zinc-500">
                  Apple fait expirer l&apos;app environ tous les 7 jours. C&apos;est normal.
                </p>
                <ol className="list-decimal space-y-1.5 pl-5 text-xs text-zinc-500">
                  <li>
                    Installe <strong>LocalDevVPN</strong> depuis l&apos;App Store (gratuit)
                  </li>
                  <li>Connecte-toi au Wi-Fi</li>
                  <li>Ouvre LocalDevVPN → appuie sur <strong>Connect</strong></li>
                  <li>Relance Anyloc depuis ton écran d&apos;accueil</li>
                </ol>
              </StepBox>
            </ol>
          ) : (
            <ol className="space-y-3">
              <StepBox number={1} title="Installe l'app Anyloc sur ton téléphone">
                {setupDownload?.available ? (
                  <a href={setupDownload.downloadPath}>
                    <Button size="sm">
                      <Download className="h-4 w-4" />
                      Télécharger l&apos;app Anyloc
                    </Button>
                  </a>
                ) : (
                  <Link href="/dashboard/installation?platform=android">
                    <Button size="sm" variant="secondary">
                      <Download className="h-4 w-4" />
                      {downloadsLoading ? "Chargement…" : "Télécharger l'app"}
                    </Button>
                  </Link>
                )}
                <p className="text-xs text-zinc-500">
                  Ouvre le fichier téléchargé et accepte l&apos;installation si Android
                  te le demande.
                </p>
              </StepBox>

              <StepBox number={2} title="Lie l'app à ton compte">
                <p>
                  Scanne le carré avec ton appareil photo, ou appuie sur le bouton
                  ci-dessous.
                </p>
                {mobileSetupLink ? (
                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                    <SetupQrCode
                      value={mobileSetupLink}
                      label="Scanne avec l'appareil photo"
                    />
                    <a href={mobileSetupLink} className="w-full sm:w-auto">
                      <Button size="sm" className="w-full">
                        <Smartphone className="h-4 w-4" />
                        Ouvrir Anyloc sur mon tel
                      </Button>
                    </a>
                  </div>
                ) : null}
              </StepBox>

              <StepBox number={3} title="Autorise la fausse position (1 fois)">
                <p className="text-xs text-zinc-500">
                  Android te demande de choisir quelle app peut changer ta position.
                </p>
                <ol className="list-decimal space-y-1.5 pl-5 text-xs text-zinc-500">
                  <li>
                    <strong>Paramètres → À propos du téléphone</strong> → tape 7 fois sur{" "}
                    <strong>Numéro de build</strong>
                  </li>
                  <li>
                    <strong>Options pour les développeurs</strong> → Active-les
                  </li>
                  <li>
                    Cherche <strong>Application de localisation fictive</strong> → choisis{" "}
                    <strong>Anyloc</strong>
                  </li>
                </ol>
              </StepBox>
            </ol>
          )}

          <details className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-zinc-700 [&::-webkit-details-marker]:hidden">
              <ChevronDown className="h-4 w-4 text-zinc-400" />
              Ça ne marche pas ? Copie le code à la main
            </summary>
            <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
              <code className="block break-all rounded-lg bg-zinc-50 px-2 py-1.5 text-[10px] text-zinc-700">
                {createdToken.token}
              </code>
              <Button size="sm" variant="secondary" onClick={() => void copyToken()}>
                <Copy className="h-4 w-4" />
                {copied ? "Copié" : "Copier le code"}
              </Button>
            </div>
          </details>

          <Link href={`/dashboard/installation?platform=${platform}`}>
            <Button variant="secondary" size="sm" className="w-full">
              <ExternalLink className="h-4 w-4" />
              Guide complet avec photos et dépannage
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
