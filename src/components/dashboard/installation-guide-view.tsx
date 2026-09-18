"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Loader2,
  Lock,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { SetupQrCode } from "@/components/dashboard/setup-qr-code";
import {
  AndroidOpenHelp,
  ComputerOnlyHint,
  SetupOpenHelp,
  WrongDeviceNotice,
} from "@/components/dashboard/setup-open-help";
import { useDownloads } from "@/hooks/use-downloads";
import { useDashboardOnboarding } from "@/hooks/use-dashboard-onboarding";
import { SetupPasswordForm } from "@/components/dashboard/setup-password-form";
import { getCheckoutUrl } from "@/lib/constants";
import {
  PAYMENT_SUCCESS_SESSION_KEY,
  writeOnboardingState,
  readOnboardingState,
} from "@/lib/dashboard-onboarding";
import {
  buildMobileSetupLink,
  getPendingTokenStorageKey,
  getPublicApiBaseUrl,
} from "@/lib/device-setup-link";
import {
  getClientDeviceSnapshot,
  SERVER_CLIENT_DEVICE,
  type DesktopOs,
} from "@/lib/platform";
import { cn } from "@/lib/utils";

type Platform = "ios" | "android";

type CreatedToken = {
  token: string;
  platform: Platform;
  apiBaseUrl: string;
};

function detectDefaultPlatform(): Platform {
  if (typeof navigator === "undefined") {
    return "ios";
  }

  return /android/i.test(navigator.userAgent) ? "android" : "ios";
}

function getInstallPageUrl(platform: Platform) {
  if (typeof window === "undefined") {
    return `https://anyloc.io/dashboard?platform=${platform}`;
  }

  return `${window.location.origin}/dashboard?platform=${platform}`;
}

function StepCard({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-zinc-200">
      <div className="flex gap-4 p-5 sm:p-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500 text-sm font-bold text-white">
          {number}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-zinc-900 sm:text-lg">
            {title}
          </h3>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-600">
            {children}
          </div>
        </div>
      </div>
    </Card>
  );
}

function HelpDetails({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-xl border border-zinc-200 bg-zinc-50/80">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-zinc-700 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600">
        {children}
      </div>
    </details>
  );
}

function DownloadButtons({
  assetIds,
  hasAccess,
  preview = false,
  onDownload,
}: {
  assetIds: string[];
  hasAccess: boolean;
  preview?: boolean;
  onDownload?: () => void;
}) {
  const { data, loading, error } = useDownloads();

  if (preview) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {assetIds.map((id) => (
          <Button key={id} className="w-full sm:w-auto" onClick={onDownload}>
            <Download className="h-4 w-4" />
            {id === "apk"
              ? "Télécharger l'app"
              : id === "setup-win"
                ? "Télécharger pour Windows"
                : "Télécharger pour Mac"}
          </Button>
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement...
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-sm text-red-600">{error ?? "Erreur de chargement."}</p>
    );
  }

  const assets = data.assets.filter((asset) => assetIds.includes(asset.id));

  if (!hasAccess) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="font-medium text-amber-900">Abonnement requis</p>
            <p className="mt-1 text-amber-800/90">
              Les fichiers se débloquent dès que ton paiement est confirmé.
            </p>
            <Link href={getCheckoutUrl("annual")} className="mt-3 inline-block">
              <Button size="sm">Voir les offres</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {assets.map((asset) =>
        asset.available ? (
          <a
            key={asset.id}
            href={asset.downloadPath}
            onClick={onDownload}
          >
            <Button className="w-full sm:w-auto">
              <Download className="h-4 w-4" />
              {asset.id === "apk"
                ? "Télécharger l'app"
                : asset.id === "setup-win"
                  ? "Télécharger pour Windows"
                  : "Télécharger pour Mac"}
            </Button>
          </a>
        ) : (
          <Button
            key={asset.id}
            disabled
            variant="secondary"
            className="w-full sm:w-auto"
          >
            {asset.label} — bientôt disponible
          </Button>
        )
      )}
    </div>
  );
}

function readCachedAndroidToken(): CreatedToken | null {
  if (typeof window === "undefined") {
    return null;
  }

  const cached = sessionStorage.getItem(getPendingTokenStorageKey("android"));
  if (!cached) {
    return null;
  }

  try {
    const parsed = JSON.parse(cached) as CreatedToken;
    if (parsed.token?.startsWith("anyloc_")) {
      return parsed;
    }
  } catch {
    sessionStorage.removeItem(getPendingTokenStorageKey("android"));
  }

  return null;
}

function AndroidLinkStep({ preview = false }: { preview?: boolean }) {
  const [createdToken, setCreatedToken] = useState<CreatedToken | null>(() =>
    preview ? null : readCachedAndroidToken()
  );
  const [creating, setCreating] = useState(() => !preview && !readCachedAndroidToken());
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createToken = useCallback(async () => {
    if (preview) {
      return;
    }
    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "android",
          deviceName: "Mon Android",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de préparer ton téléphone.");
      }

      const nextToken: CreatedToken = {
        token: data.token,
        platform: "android",
        apiBaseUrl: data.apiBaseUrl ?? getPublicApiBaseUrl(),
      };

      sessionStorage.setItem(
        getPendingTokenStorageKey("android"),
        JSON.stringify(nextToken)
      );
      setCreatedToken(nextToken);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Impossible de préparer ton téléphone."
      );
    } finally {
      setCreating(false);
    }
  }, [preview]);

  useEffect(() => {
    if (preview || createdToken) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/device", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: "android",
            deviceName: "Mon Android",
          }),
        });
        const data = await response.json();
        if (cancelled) {
          return;
        }
        if (!response.ok) {
          throw new Error(data.error ?? "Impossible de préparer ton téléphone.");
        }
        const nextToken: CreatedToken = {
          token: data.token,
          platform: "android",
          apiBaseUrl: data.apiBaseUrl ?? getPublicApiBaseUrl(),
        };
        sessionStorage.setItem(
          getPendingTokenStorageKey("android"),
          JSON.stringify(nextToken)
        );
        setCreatedToken(nextToken);
      } catch (createError) {
        if (!cancelled) {
          setError(
            createError instanceof Error
              ? createError.message
              : "Impossible de préparer ton téléphone."
          );
        }
      } finally {
        if (!cancelled) {
          setCreating(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [createdToken, preview]);

  const mobileSetupLink = useMemo(() => {
    if (!createdToken) {
      return null;
    }

    return buildMobileSetupLink(createdToken.token, createdToken.apiBaseUrl);
  }, [createdToken]);

  const copyToken = async () => {
    if (!createdToken) {
      return;
    }

    await navigator.clipboard.writeText(createdToken.token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (preview) {
    return (
      <p>
        Sur ce même téléphone, un bouton <strong>Ouvrir Anyloc</strong> et un QR
        apparaissent ici. L&apos;app s&apos;ouvre déjà liée à ton compte.
      </p>
    );
  }

  if (creating || !createdToken) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Préparation du lien…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">{error}</p>
        <Button size="sm" onClick={() => void createToken()}>
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p>
        Sur ce même téléphone, appuie sur le bouton. Sinon, scanne le carré avec
        l&apos;appareil photo.
      </p>
      {mobileSetupLink ? (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <SetupQrCode
            value={mobileSetupLink}
            label="Scanne avec l'appareil photo"
          />
          <a href={mobileSetupLink} className="w-full sm:w-auto">
            <Button className="w-full">
              <Smartphone className="h-4 w-4" />
              Ouvrir Anyloc sur mon tel
            </Button>
          </a>
        </div>
      ) : null}

      <HelpDetails title="Le bouton ne marche pas ? Copie le code à la main">
        <code className="block break-all rounded-lg bg-white px-3 py-2 text-xs text-zinc-800">
          {createdToken.token}
        </code>
        <Button size="sm" className="mt-3" onClick={() => void copyToken()}>
          <Copy className="h-4 w-4" />
          {copied ? "Copié" : "Copier le code"}
        </Button>
        <p className="mt-2 text-xs text-zinc-500">
          Colle-le dans l&apos;app Anyloc, dans le champ prévu.
        </p>
      </HelpDetails>
    </div>
  );
}

function IosGuide({
  hasAccess,
  preview = false,
  forcePhone = false,
  needsSetupPassword = false,
}: {
  hasAccess: boolean;
  preview?: boolean;
  forcePhone?: boolean;
  needsSetupPassword?: boolean;
}) {
  const device = useSyncExternalStore(
    () => () => {},
    getClientDeviceSnapshot,
    () => SERVER_CLIENT_DEVICE
  );
  const [desktopOs, setDesktopOs] = useState<DesktopOs | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const resolvedOs = desktopOs ?? device.desktopOs;
  const installUrl = getInstallPageUrl("ios");
  const isPhone = forcePhone || device.isPhone;

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        iPhone : Mac ou PC + câble. Tu changes la ville depuis le téléphone,
        mais <strong>le câble reste branché</strong> et Anyloc Setup reste
        ouvert — sinon Snap revoit ta vraie position.
      </p>

      {needsSetupPassword ? <SetupPasswordForm preview={preview} /> : null}

      {isPhone ? (
        <WrongDeviceNotice
          title="Tu es sur ton téléphone — le fichier ne s'ouvre pas ici"
          href={installUrl}
          copyLabel="Copier le lien pour l'ordinateur"
        >
          <p>
            Anyloc Setup est un programme d&apos;ordinateur. Si tu le
            télécharges ici, tu te retrouves avec un fichier / dossier qui ne
            s&apos;ouvre pas.
          </p>
          <p>
            1. Prends ton Mac ou ton PC · 2. Ouvre le lien · 3. Télécharge
            depuis cette page.
          </p>
        </WrongDeviceNotice>
      ) : null}

      <StepCard number={1} title="Télécharge, puis ouvre le fichier">
        {isPhone ? (
          <ComputerOnlyHint />
        ) : (
          <>
            <p>
              Un seul bouton. Le fichier va dans{" "}
              <strong>Téléchargements</strong> — il ne s&apos;ouvre pas tout
              seul.
            </p>
            <DownloadButtons
              assetIds={resolvedOs === "win" ? ["setup-win"] : ["setup-mac"]}
              hasAccess={hasAccess}
              preview={preview}
              onDownload={() => setDownloaded(true)}
            />
            <button
              type="button"
              className="text-xs font-medium text-pink-600 underline-offset-2 hover:underline"
              onClick={() =>
                setDesktopOs(resolvedOs === "mac" ? "win" : "mac")
              }
            >
              {resolvedOs === "mac" ? "J'ai un PC Windows" : "J'ai un Mac"}
            </button>
          </>
        )}
        <SetupOpenHelp
          desktopOs={resolvedOs}
          onDesktopOsChange={(os) => setDesktopOs(os)}
          downloaded={downloaded}
        />
      </StepCard>

      <StepCard number={2} title="Branche l'iPhone et installe">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Ouvre <strong>Anyloc Setup</strong> et connecte-toi avec le{" "}
            <strong>même compte</strong> (bouton Google = le plus simple)
          </li>
          <li>
            Branche le câble, déverrouille l&apos;iPhone, appuie sur{" "}
            <strong>Faire confiance</strong>
          </li>
          <li>
            Clique <strong>Installer l&apos;app iPhone</strong>
          </li>
        </ol>
        <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          {needsSetupPassword ? (
            <>
              Utilise le mot de passe que tu viens de choisir, ou le bouton{" "}
              <strong>Google</strong> (même compte que le paiement).
            </>
          ) : (
            <>
              Pas de mot de passe ? Sur cette page : <strong>Mon compte</strong>{" "}
              → choisis-en un, puis reconnecte-toi dans Anyloc Setup.
            </>
          )}
        </p>
        <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          iOS demande le <strong>mode développeur</strong> ? Réglages →
          Confidentialité et sécurité → Mode développeur → ON → redémarre →
          rebranche, puis Installer.
        </p>
        <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          L&apos;iPhone n&apos;apparaît pas ? Déverrouille, rebranche, appuie
          sur <strong>Faire confiance</strong>. Sur Mac, ouvre le Finder et
          accepte. Dans Anyloc Setup, clique <strong>Revérifier</strong>.
        </p>
      </StepCard>

      <StepCard number={3} title="Ouvre Anyloc — laisse le câble branché">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Si l&apos;app est grise ou refuse de s&apos;ouvrir : Réglages →
            Général → <strong>VPN et gestion de l&apos;appareil</strong> →
            Anyloc → <strong>Faire confiance</strong>
          </li>
          <li>
            Ouvre <strong>Anyloc</strong> — même Google, ou l&apos;email + le
            mot de passe de <strong>Mon compte</strong> — puis choisis une
            ville
          </li>
          <li>
            Vérifie dans Snap ou Plans — la loc a changé
          </li>
        </ol>
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <strong>Laisse l&apos;iPhone branché</strong> et Anyloc Setup ouvert
          (icône en haut de l&apos;écran). Si tu débranches, Snap revoit ta
          vraie position. C&apos;est normal.
        </p>
        <HelpDetails title="Dans ~7 jours, l'app iPhone s'arrête ?">
          <p className="mb-2">
            Normal (limite Apple). Installe <strong>LocalDevVPN</strong> (App
            Store, gratuit), Wi-Fi → <strong>Connect</strong>, puis relance
            Anyloc. Pas besoin de réinstaller.
          </p>
        </HelpDetails>
      </StepCard>
    </div>
  );
}

function AndroidGuide({
  hasAccess,
  preview = false,
  forceComputer = false,
  forcePhone = false,
}: {
  hasAccess: boolean;
  preview?: boolean;
  forceComputer?: boolean;
  forcePhone?: boolean;
}) {
  const device = useSyncExternalStore(
    () => () => {},
    getClientDeviceSnapshot,
    () => SERVER_CLIENT_DEVICE
  );
  const [downloaded, setDownloaded] = useState(false);
  const installUrl = getInstallPageUrl("android");
  const onComputer = forceComputer || (!forcePhone && !device.isPhone);

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        Android : tout se fait sur le téléphone. Pas d&apos;ordinateur.
      </p>

      {onComputer ? (
        <WrongDeviceNotice
          title="Télécharge depuis ton Android, pas depuis l'ordinateur"
          href={installUrl}
          copyLabel="Copier le lien"
          qrLabel="Scanne avec ton Android"
        >
          <p>
            L&apos;app s&apos;installe sur le téléphone. Si tu télécharges ici,
            tu te retrouves avec un fichier qui ne s&apos;ouvre pas.
          </p>
          <p>
            Ouvre ce lien dans Chrome sur ton Android, puis appuie sur
            Télécharger.
          </p>
        </WrongDeviceNotice>
      ) : null}

      <StepCard number={1} title="Télécharge, puis ouvre le fichier">
        {onComputer ? (
          <p className="text-xs text-zinc-500">
            Les boutons ci-dessous sont pour quand tu es sur le téléphone.
          </p>
        ) : (
          <p>
            Appuie, puis ouvre le fichier dans{" "}
            <strong>Téléchargements</strong>. Il ne s&apos;installe pas tout
            seul.
          </p>
        )}
        <DownloadButtons
          assetIds={["apk"]}
          hasAccess={hasAccess}
          preview={preview}
          onDownload={() => setDownloaded(true)}
        />
        <AndroidOpenHelp downloaded={downloaded} />
      </StepCard>

      <StepCard number={2} title="Ouvre Anyloc (le gros écran rose te guide)">
        <AndroidLinkStep preview={preview} />
        <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          L&apos;app te demande d&apos;autoriser la fausse position. Appuie sur
          ses boutons — tu n&apos;as pas à chercher dans les réglages tout
          seul.
        </p>
      </StepCard>

      <StepCard number={3} title="Choisis une ville, vérifie dans Snap">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Cherche une ville dans l&apos;app (Marbella, Paris…)</li>
          <li>Ouvre Snap ou Maps — la loc a changé</li>
        </ol>
        <HelpDetails title="La loc ne change pas ?">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>Dans l&apos;app, suis l&apos;écran « Encore 1 étape »</li>
            <li>Anyloc doit être l&apos;app de localisation fictive</li>
            <li>Active le GPS, puis ferme et rouvre Snap</li>
          </ol>
        </HelpDetails>
      </StepCard>
    </div>
  );
}

export function InstallationGuideView({
  embedded = false,
  preview = false,
}: { embedded?: boolean; preview?: boolean } = {}) {
  const searchParams = useSearchParams();
  const { data, loading } = useDownloads();
  const { completeStep, state } = useDashboardOnboarding();
  const urlPlatform = searchParams.get("platform");
  const platformFromUrl =
    urlPlatform === "android" || urlPlatform === "ios" ? urlPlatform : null;
  const detectedPlatform = useSyncExternalStore(
    () => () => {},
    detectDefaultPlatform,
    () => "ios" as Platform
  );
  const [manualPlatform, setManualPlatform] = useState<Platform | null>(null);
  const platform = manualPlatform ?? platformFromUrl ?? detectedPlatform;
  const [paymentSuccess, setPaymentSuccess] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.sessionStorage.getItem(PAYMENT_SUCCESS_SESSION_KEY) === "true";
  });

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const urlSuccess = searchParams.get("success") === "true";

    const clearPaymentParams = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.pathname + url.search);
    };

    const markPaymentSuccess = () => {
      window.sessionStorage.setItem(PAYMENT_SUCCESS_SESSION_KEY, "true");
      setPaymentSuccess(true);
      const stored = readOnboardingState();
      writeOnboardingState({ ...stored, welcomeDismissed: true });
      clearPaymentParams();
    };

    if (urlSuccess && sessionId) {
      void fetch(`/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`)
        .then(async (response) => {
          if (!response.ok) {
            return;
          }

          const payload = await response.json();
          if (payload.verified) {
            markPaymentSuccess();
          }
        })
        .catch(() => {
          // Keep the dashboard usable if verification fails.
        });
    }
  }, [searchParams]);

  const hasAccess = preview || (data?.hasAccess ?? false);

  return (
    <div className={embedded ? "" : "min-h-screen bg-background"}>
      {!embedded && <DashboardPageHeader title="Installation" />}

      <main className={embedded ? "" : "p-4 pb-8 sm:p-6 lg:p-8"}>
        {paymentSuccess && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-900">C&apos;est payé — 3 étapes.</p>
                <p className="mt-1 text-sm text-emerald-800">
                  Choisis iPhone ou Android, puis suis uniquement les 3 cases
                  ci-dessous.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-medium text-pink-600">Installation</p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900 sm:text-3xl">
            3 étapes, et ta loc change
          </h1>
          <p className="mt-3 text-zinc-600">
            Un seul chemin. Choisis ton téléphone, puis fais les 3 étapes dans
            l&apos;ordre.
          </p>

          <div className="mt-8 flex gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-1.5">
            <button
              type="button"
              onClick={() => setManualPlatform("ios")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                platform === "ios"
                  ? "bg-white text-pink-600 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              )}
            >
              <Smartphone className="h-4 w-4" />
              iPhone
            </button>
            <button
              type="button"
              onClick={() => setManualPlatform("android")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                platform === "android"
                  ? "bg-white text-pink-600 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              )}
            >
              <Smartphone className="h-4 w-4" />
              Android
            </button>
          </div>

          {loading && !preview ? (
            <div className="mt-8 flex items-center justify-center gap-2 py-12 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement du guide...
            </div>
          ) : platform === "ios" ? (
            <div className="mt-8">
              <IosGuide
                hasAccess={hasAccess}
                preview={preview}
                forcePhone={preview && searchParams.get("device") === "phone"}
                needsSetupPassword={
                  preview || Boolean(data?.needsSetupPassword)
                }
              />
            </div>
          ) : (
            <div className="mt-8">
              <AndroidGuide
                hasAccess={hasAccess}
                preview={preview}
                forceComputer={preview && searchParams.get("device") === "computer"}
                forcePhone={preview && searchParams.get("device") === "phone"}
              />
            </div>
          )}

          {data?.isAdmin && (
            <p className="mt-6 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
              Mode admin actif — accès dev sans abonnement.
            </p>
          )}

          {!state.steps.install && (
            <Card className="mt-8 border-emerald-200 bg-emerald-50/50 p-5 sm:p-6">
              <h3 className="font-semibold text-zinc-900">
                Ta loc a changé ?
              </h3>
              <p className="mt-2 text-sm text-zinc-600">
                Confirme seulement si tu as vu la nouvelle position dans Maps ou
                Snap.
              </p>
              <div className="mt-4">
                <Button onClick={() => completeStep("install")}>
                  <CheckCircle2 className="h-4 w-4" />
                  Oui, ça marche
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
