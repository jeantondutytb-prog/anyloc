"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Loader2,
  Lock,
  Monitor,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { SetupQrCode } from "@/components/dashboard/setup-qr-code";
import {
  AndroidOpenHelp,
  SetupOpenHelp,
  WrongDeviceNotice,
} from "@/components/dashboard/setup-open-help";
import { useDownloads } from "@/hooks/use-downloads";
import { useDashboardOnboarding } from "@/hooks/use-dashboard-onboarding";
import { usePaymentSuccess } from "@/hooks/use-payment-success";
import { SetupPasswordForm } from "@/components/dashboard/setup-password-form";
import { capturePostHogClientEvent } from "@/lib/posthog/browser";
import { getCheckoutUrl } from "@/lib/constants";
import {
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

// ── Wizard chrome ──

function WizardProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-zinc-500">
        {current + 1}/{total}
      </span>
      <div className="flex flex-1 gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 flex-1 rounded-full transition-all duration-300",
              i <= current ? "bg-pink-500" : "bg-zinc-200"
            )}
          />
        ))}
      </div>
    </div>
  );
}

function WizardNav({
  step,
  total,
  onNext,
  onBack,
  nextLabel,
  nextDisabled = false,
  hideNext = false,
}: {
  step: number;
  total: number;
  onNext: () => void;
  onBack: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hideNext?: boolean;
}) {
  return (
    <div className="mt-8 flex items-center gap-3">
      {step > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-zinc-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
      ) : (
        <div />
      )}
      <div className="flex-1" />
      {!hideNext && (
        <Button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="px-6"
        >
          {nextLabel ?? "Suivant"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// ── Shared helpers ──

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

function getDownloadButtonLabel(assetId: string) {
  if (assetId === "apk" || assetId === "ipa") {
    return "Télécharger l'app";
  }

  return "Télécharger Anyloc";
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

  function handleDownload(assetId: string) {
    capturePostHogClientEvent("app_downloaded", { platform: assetId });
    onDownload?.();
  }

  if (preview) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {assetIds.map((id) => (
          <Button key={id} className="w-full sm:w-auto" onClick={() => handleDownload(id)}>
            <Download className="h-4 w-4" />
            {getDownloadButtonLabel(id)}
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

  const assets = data.assets.filter(
    (asset) => assetIds.includes(asset.id) && !asset.hidden
  );

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
            onClick={() => handleDownload(asset.id)}
          >
            <Button className="w-full sm:w-auto">
              <Download className="h-4 w-4" />
              {getDownloadButtonLabel(asset.id)}
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

function IosOtaInstallButton({
  hasAccess,
  preview = false,
}: {
  hasAccess: boolean;
  preview?: boolean;
}) {
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startInstall = async () => {
    if (preview) {
      return;
    }

    setInstalling(true);
    setError(null);

    try {
      const response = await fetch("/api/ios/install-link", { method: "POST" });
      const data = (await response.json()) as {
        installUrl?: string;
        error?: string;
      };

      if (!response.ok || !data.installUrl) {
        throw new Error(data.error ?? "Impossible de lancer l'installation.");
      }

      window.location.href = data.installUrl;
    } catch (installError) {
      setError(
        installError instanceof Error
          ? installError.message
          : "Impossible de lancer l'installation."
      );
    } finally {
      setInstalling(false);
    }
  };

  if (preview) {
    return (
      <Button className="w-full sm:w-auto">
        <Smartphone className="h-4 w-4" />
        Installer Anyloc
      </Button>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Button
        className="w-full sm:w-auto"
        disabled={installing}
        onClick={() => void startInstall()}
      >
        {installing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Smartphone className="h-4 w-4" />
        )}
        {installing ? "Préparation…" : "Installer Anyloc"}
      </Button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

// ── Wizard step pages ──

function PlatformPickStep({
  platform,
  onPick,
}: {
  platform: Platform;
  onPick: (p: Platform) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">
          C&apos;est pour quel téléphone ?
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Choisis pour avoir les bonnes étapes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {(["ios", "android"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPick(p)}
            className={cn(
              "flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all",
              platform === p
                ? "border-pink-500 bg-pink-50 shadow-sm"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            )}
          >
            <Smartphone
              className={cn(
                "h-8 w-8",
                platform === p ? "text-pink-500" : "text-zinc-400"
              )}
            />
            <span
              className={cn(
                "text-base font-semibold",
                platform === p ? "text-pink-600" : "text-zinc-700"
              )}
            >
              {p === "ios" ? "iPhone" : "Android"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function IosDownloadStep({
  hasAccess,
  preview,
  isPhone,
  needsSetupPassword,
  zipDownloadPath,
}: {
  hasAccess: boolean;
  preview: boolean;
  isPhone: boolean;
  needsSetupPassword: boolean;
  zipDownloadPath?: string | null;
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

  if (isPhone) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">
            Télécharge Anyloc sur ton ordi
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            iPhone a besoin d&apos;un Mac ou PC pour changer le GPS.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Pourquoi un ordinateur ?</p>
          <p className="mt-1 text-amber-800/90">
            Apple verrouille le GPS. Anyloc passe par un logiciel sur ton
            ordi pour le changer vraiment (Snap Map, Maps, toutes tes apps).
          </p>
        </div>

        {needsSetupPassword ? <SetupPasswordForm preview={preview} /> : null}

        <WrongDeviceNotice
          title="Ouvre ce lien sur ton Mac ou PC"
          href={installUrl}
          copyLabel="Copier le lien"
        >
          <p>Anyloc s&apos;installe sur l&apos;ordi, pas sur le téléphone.</p>
        </WrongDeviceNotice>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">
          Télécharge Anyloc
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Un seul fichier à installer sur ton {resolvedOs === "win" ? "PC" : "Mac"}.
        </p>
      </div>

      {needsSetupPassword ? <SetupPasswordForm preview={preview} /> : null}

      <Card className="p-5">
        <p className="text-sm text-zinc-600">
          {resolvedOs === "win" ? (
            <>
              Windows va dire <strong>« Faites attention »</strong>. Clique{" "}
              <strong>Conserver</strong> — ce n&apos;est pas un virus.
            </>
          ) : (
            <>
              Le fichier va dans <strong>Téléchargements</strong>. Il ne
              s&apos;ouvre pas tout seul.
            </>
          )}
        </p>
        <div className="mt-4">
          <DownloadButtons
            assetIds={resolvedOs === "win" ? ["setup-win"] : ["setup-mac"]}
            hasAccess={hasAccess}
            preview={preview}
            onDownload={() => setDownloaded(true)}
          />
        </div>
        <button
          type="button"
          className="mt-3 text-xs font-medium text-pink-600 underline-offset-2 hover:underline"
          onClick={() => setDesktopOs(resolvedOs === "mac" ? "win" : "mac")}
        >
          {resolvedOs === "mac" ? "J'ai un PC Windows" : "J'ai un Mac"}
        </button>
      </Card>

      <SetupOpenHelp
        desktopOs={resolvedOs}
        onDesktopOsChange={(os) => setDesktopOs(os)}
        downloaded={downloaded}
        zipDownloadPath={zipDownloadPath}
      />
    </div>
  );
}

function IosInstallStep({ isPhone }: { isPhone: boolean }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">
          Branche ton iPhone et installe
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Un câble USB, 30 secondes.
        </p>
      </div>

      <Card className="p-5">
        <ol className="list-decimal space-y-4 pl-5 text-sm text-zinc-700">
          <li>
            <strong>Ouvre Anyloc</strong> sur ton {isPhone ? "ordi" : "ordinateur"} et
            connecte-toi avec le même email que ton paiement
          </li>
          <li>
            <strong>Branche l&apos;iPhone</strong> en USB, déverrouille-le et
            appuie <strong>Faire confiance</strong> sur l&apos;écran de
            l&apos;iPhone
          </li>
          <li>
            Clique <strong>Installer</strong> dans Anyloc — l&apos;app se met
            sur ton téléphone
          </li>
        </ol>
      </Card>

      <HelpDetails title="L'iPhone n'est pas détecté ?">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            Essaie un autre câble USB (certains ne font que charger)
          </li>
          <li>
            Déverrouille l&apos;iPhone et appuie <strong>Faire confiance</strong>{" "}
            quand ça apparaît
          </li>
          <li>Débranche et rebranche le câble</li>
        </ol>
      </HelpDetails>
    </div>
  );
}

function IosVerifyStep() {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">
          Choisis une ville, vérifie dans Snap
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          C&apos;est le moment de tester.
        </p>
      </div>

      <Card className="p-5">
        <ol className="list-decimal space-y-4 pl-5 text-sm text-zinc-700">
          <li>
            Dans Anyloc (ordi ou app iPhone), choisis{" "}
            <strong>Marbella</strong>, <strong>Paris</strong>…
          </li>
          <li>
            Ouvre <strong>Snap</strong> ou <strong>Maps</strong> sur
            l&apos;iPhone — ta position a changé
          </li>
          <li className="text-zinc-500">
            L&apos;ordi garde le GPS actif tant que l&apos;iPhone est branché
          </li>
        </ol>
      </Card>

      <HelpDetails title="Dans ~7 jours, l'app iPhone s'arrête ?">
        <p className="mb-2">
          Normal (limite Apple sans compte Developer payant). Installe{" "}
          <strong>LocalDevVPN</strong> (App Store, gratuit), connecte le Wi-Fi,
          puis dans Anyloc iPhone : <strong>Profil → Renouveler</strong>.
        </p>
      </HelpDetails>
    </div>
  );
}

function AndroidDownloadStep({
  hasAccess,
  preview,
  isPhone,
}: {
  hasAccess: boolean;
  preview: boolean;
  isPhone: boolean;
}) {
  const [downloaded, setDownloaded] = useState(false);
  const installUrl = getInstallPageUrl("android");

  if (!isPhone) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">
            Télécharge sur ton Android
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            L&apos;app s&apos;installe depuis le téléphone, pas l&apos;ordi.
          </p>
        </div>

        <WrongDeviceNotice
          title="Ouvre ce lien sur ton Android"
          href={installUrl}
          copyLabel="Copier le lien"
          qrLabel="Scanne avec ton Android"
        >
          <p>
            Ouvre ce lien dans Chrome sur ton Android, puis appuie sur
            Télécharger.
          </p>
        </WrongDeviceNotice>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">
          Télécharge l&apos;app
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Un fichier APK à installer directement.
        </p>
      </div>

      <Card className="p-5">
        <p className="text-sm text-zinc-600">
          Appuie, puis ouvre le fichier dans{" "}
          <strong>Téléchargements</strong>. Il ne s&apos;installe pas tout seul.
        </p>
        <div className="mt-4">
          <DownloadButtons
            assetIds={["apk"]}
            hasAccess={hasAccess}
            preview={preview}
            onDownload={() => setDownloaded(true)}
          />
        </div>
      </Card>

      <AndroidOpenHelp downloaded={downloaded} />
    </div>
  );
}

function AndroidSetupStep({ preview }: { preview: boolean }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">
          Ouvre l&apos;app et connecte-toi
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          L&apos;écran rose te guide pour tout configurer.
        </p>
      </div>

      <Card className="p-5">
        <AndroidLinkStep preview={preview} />
        <p className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          L&apos;app te demande d&apos;autoriser la fausse position. Appuie sur
          ses boutons — tu n&apos;as pas à chercher dans les réglages tout seul.
        </p>
      </Card>
    </div>
  );
}

function AndroidVerifyStep() {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">
          Choisis une ville, vérifie dans Snap
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          C&apos;est le moment de tester.
        </p>
      </div>

      <Card className="p-5">
        <ol className="list-decimal space-y-4 pl-5 text-sm text-zinc-700">
          <li>
            Cherche une ville dans l&apos;app (<strong>Marbella</strong>,{" "}
            <strong>Paris</strong>…)
          </li>
          <li>
            Ouvre <strong>Snap</strong> ou <strong>Maps</strong> — la loc a changé
          </li>
        </ol>
      </Card>

      <HelpDetails title="La loc ne change pas ?">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Dans l&apos;app, suis l&apos;écran « Encore 1 étape »</li>
          <li>Anyloc doit être l&apos;app de localisation fictive</li>
          <li>Active le GPS, puis ferme et rouvre Snap</li>
        </ol>
      </HelpDetails>
    </div>
  );
}

function ConfirmStep({
  onConfirm,
}: {
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-zinc-900 sm:text-2xl">
          Ta loc a changé ?
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Confirme seulement si tu as vu la nouvelle position dans Maps ou Snap.
        </p>
      </div>

      <div className="flex justify-center">
        <Button size="lg" onClick={onConfirm} className="px-8">
          <CheckCircle2 className="h-5 w-5" />
          Oui, ça marche
        </Button>
      </div>
    </div>
  );
}

// ── Main wizard ──

const TOTAL_STEPS = 5; // platform pick + 3 content steps + confirm

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
  const [platform, setPlatform] = useState<Platform>(
    platformFromUrl ?? detectedPlatform
  );
  const [step, setStep] = useState(platformFromUrl ? 1 : 0);
  const paymentSuccess = usePaymentSuccess();

  const device = useSyncExternalStore(
    () => () => {},
    getClientDeviceSnapshot,
    () => SERVER_CLIENT_DEVICE
  );
  const isPhone = device.isPhone || (preview && searchParams.get("device") === "phone");

  useEffect(() => {
    if (!paymentSuccess) {
      return;
    }

    const stored = readOnboardingState();
    if (!stored.welcomeDismissed) {
      writeOnboardingState({ ...stored, welcomeDismissed: true });
    }
  }, [paymentSuccess]);

  const hasAccess = preview || (data?.hasAccess ?? false);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handlePlatformPick = (p: Platform) => {
    setPlatform(p);
  };

  const renderStep = () => {
    if (loading && !preview && step > 0) {
      return (
        <div className="flex items-center justify-center gap-2 py-16 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement...
        </div>
      );
    }

    switch (step) {
      case 0:
        return (
          <PlatformPickStep platform={platform} onPick={handlePlatformPick} />
        );

      case 1:
        return platform === "ios" ? (
          <IosDownloadStep
            hasAccess={hasAccess}
            preview={preview}
            isPhone={isPhone}
            needsSetupPassword={preview || Boolean(data?.needsSetupPassword)}
            zipDownloadPath={
              data?.assets.find(
                (asset) => asset.id === "setup-win-zip" && asset.available
              )?.downloadPath
            }
          />
        ) : (
          <AndroidDownloadStep
            hasAccess={hasAccess}
            preview={preview}
            isPhone={isPhone}
          />
        );

      case 2:
        return platform === "ios" ? (
          <IosInstallStep isPhone={isPhone} />
        ) : (
          <AndroidSetupStep preview={preview} />
        );

      case 3:
        return platform === "ios" ? (
          <IosVerifyStep />
        ) : (
          <AndroidVerifyStep />
        );

      case 4:
        return (
          <ConfirmStep onConfirm={() => completeStep("install")} />
        );

      default:
        return null;
    }
  };

  return (
    <div className={embedded ? "" : "min-h-screen bg-background"}>
      {!embedded && <DashboardPageHeader title="Installation" />}

      <main className={embedded ? "" : "p-4 pb-8 sm:p-6 lg:p-8"}>
        {paymentSuccess && step === 0 && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-900">
                  C&apos;est payé — 3 étapes et c&apos;est bon.
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  Choisis ton téléphone, puis suis les étapes une par une.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-lg">
          {step > 0 && (
            <div className="mb-6">
              <WizardProgress current={step - 1} total={TOTAL_STEPS - 2} />
            </div>
          )}

          {renderStep()}

          {step < TOTAL_STEPS - 1 && (
            <WizardNav
              step={step}
              total={TOTAL_STEPS}
              onNext={next}
              onBack={back}
              nextLabel={step === 0 ? "C'est parti" : step === 3 ? "Terminé" : undefined}
            />
          )}

          {step === 4 && (
            <WizardNav
              step={step}
              total={TOTAL_STEPS}
              onNext={() => {}}
              onBack={back}
              hideNext
            />
          )}

          {data?.isAdmin && (
            <p className="mt-6 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
              Mode admin actif — accès dev sans abonnement.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
