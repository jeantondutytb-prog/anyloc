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
import { IOS_APP_UNAVAILABLE_HINT, IOS_SETUP_SYNC_HINT } from "@/lib/platform";
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

function readCachedToken(platform: Platform): CreatedToken | null {
  if (typeof window === "undefined") {
    return null;
  }

  const cached = sessionStorage.getItem(getPendingTokenStorageKey(platform));
  if (!cached) {
    return null;
  }

  try {
    const parsed = JSON.parse(cached) as CreatedToken;
    if (parsed.token?.startsWith("anyloc_")) {
      return parsed;
    }
  } catch {
    sessionStorage.removeItem(getPendingTokenStorageKey(platform));
  }

  return null;
}

export function DashboardPhoneSetup({
  devices,
  phoneOnline,
  onLinked,
  compact = false,
}: DashboardPhoneSetupProps) {
  const [platform, setPlatform] = useState<Platform>(detectPlatform);
  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<CreatedToken | null>(() =>
    readCachedToken(detectPlatform())
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { data: downloads, loading: downloadsLoading } = useDownloads();

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
    if (phoneOnline || linkedForPlatform || createdToken) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void createToken();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [createToken, createdToken, linkedForPlatform, phoneOnline]);

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

  const hasIosDevice = devices.some((device) => device.platform === "ios");

  if (phoneOnline) {
    return (
      <div className="space-y-3">
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
        {hasIosDevice ? (
          <details className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-zinc-700 [&::-webkit-details-marker]:hidden">
              <ChevronDown className="h-4 w-4 text-zinc-400" />
              iPhone : rappels importants
            </summary>
            <ul className="mt-3 space-y-2 border-t border-zinc-100 pt-3 text-xs leading-relaxed text-zinc-600">
              <li>
                Anyloc Setup doit rester ouvert sur ton Mac ou PC, avec le câble
                branché.
              </li>
              <li>{IOS_SETUP_SYNC_HINT}</li>
              <li>{IOS_APP_UNAVAILABLE_HINT}</li>
            </ul>
          </details>
        ) : null}
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
              ? " Sur iPhone, laisse Anyloc Setup ouvert sur ton ordi avec le câble branché. Si l'app refuse de s'ouvrir (« n'est plus disponible »), réinstalle depuis Setup."
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
          On prépare ton téléphone. Suis les étapes dans l&apos;ordre — ton mot de
          passe est déjà créé, tu n&apos;as presque rien à taper toi-même.
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
              setCreatedToken(readCachedToken(value));
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
              <StepBox number={1} title="Sur l'ordinateur : installe l'app">
                <p>
                  Télécharge <strong>Anyloc Setup</strong>. Le fichier va dans
                  Téléchargements et <strong>ne s&apos;ouvre pas tout seul</strong>.
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
                        Ouvrir Anyloc Setup
                      </Button>
                    </a>
                  ) : null}
                </div>
                {isMac ? (
                  <ol className="list-decimal space-y-1.5 pl-5 text-xs text-zinc-500">
                    <li>Double-clique le fichier — une fenêtre (dossier) s&apos;ouvre</li>
                    <li>Glisse Anyloc Setup sur Applications</li>
                    <li>
                      Clic <strong>droit</strong> → Ouvrir → Ouvrir (pas un
                      double-clic)
                    </li>
                  </ol>
                ) : (
                  <ol className="list-decimal space-y-1.5 pl-5 text-xs text-zinc-500">
                    <li>Double-clique le fichier dans Téléchargements</li>
                    <li>Plus d&apos;infos → Exécuter quand même</li>
                  </ol>
                )}
              </StepBox>

              <StepBox number={2} title="Sur l'iPhone : ouvre Anyloc">
                <p>
                  Connecte-toi avec le <strong>même compte</strong>, puis choisis
                  une ville. Pas de code à coller.
                </p>
              </StepBox>

              <StepBox number={3} title="Si l'app s'arrête dans ~7 jours">
                <p className="text-xs text-zinc-500">
                  Installe <strong>LocalDevVPN</strong> (App Store), Wi-Fi →
                  Connect, puis relance Anyloc. Sans ordinateur.
                </p>
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
                  Le fichier est dans Téléchargements. Appuie dessus, autorise
                  l&apos;installation si Android bloque.
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
                    <strong>Options pour les développeurs</strong> → active-les
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
              Ça ne marche pas ? Copie le mot de passe à la main
            </summary>
            <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
              <code className="block break-all rounded-lg bg-zinc-50 px-2 py-1.5 text-[10px] text-zinc-700">
                {createdToken.token}
              </code>
              <Button size="sm" variant="secondary" onClick={() => void copyToken()}>
                <Copy className="h-4 w-4" />
                {copied ? "Copié" : "Copier le mot de passe"}
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
