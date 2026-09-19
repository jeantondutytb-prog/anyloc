"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Monitor,
  Smartphone,
  Usb,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { SetupQrCode } from "@/components/dashboard/setup-qr-code";
import { WindowsOpenHelp } from "@/components/dashboard/windows-open-help";
import { SetupPasswordForm } from "@/components/dashboard/setup-password-form";
import {
  WizardChecklist,
  WizardInstruction,
  WizardPrimaryButton,
  WizardSecondaryButton,
  WizardShell,
  WizardSkipButton,
  WizardStatusBox,
  WizardSuccessCard,
  WizardTip,
  WIZARD_TOTAL_STEPS,
  wizardPrimaryClassName,
  wizardSecondaryClassName,
} from "@/components/dashboard/installation-wizard-ui";
import { useDownloads } from "@/hooks/use-downloads";
import { useDashboardOnboarding } from "@/hooks/use-dashboard-onboarding";
import { useInstallWizardSession } from "@/hooks/use-install-wizard-session";
import { getCheckoutUrl } from "@/lib/constants";
import {
  PAYMENT_SUCCESS_SESSION_KEY,
  clearInstallWizardSession,
  readOnboardingState,
  writeOnboardingState,
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

function HelpDetails({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-xl border border-white/10 bg-white/5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-zinc-300 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-white/10 px-4 py-3 text-sm text-zinc-400">
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
  data,
  loading,
  error,
}: {
  assetIds: string[];
  hasAccess: boolean;
  preview?: boolean;
  onDownload?: () => void;
  data: ReturnType<typeof useDownloads>["data"];
  loading: boolean;
  error: string | null;
}) {
  if (preview) {
    return (
      <div className="space-y-2">
        {assetIds.map((id) => (
          <WizardPrimaryButton key={id} onClick={onDownload}>
            <Download className="h-4 w-4" />
            {id === "apk" ? "Télécharger l'app" : "Télécharger Anyloc"}
          </WizardPrimaryButton>
        ))}
      </div>
    );
  }

  if (loading || error || !data) {
    return null;
  }

  const assets = data.assets.filter(
    (asset) => assetIds.includes(asset.id) && !asset.hidden
  );

  if (!hasAccess) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
        <div className="flex items-start gap-2">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="font-medium text-amber-100">Abonnement requis</p>
            <p className="mt-1 text-sm text-amber-200/80">
              Les fichiers se débloquent dès que ton paiement est confirmé.
            </p>
            <Link href={getCheckoutUrl("annual")} className="mt-3 inline-block">
              <WizardPrimaryButton>Voir les offres</WizardPrimaryButton>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {assets.map((asset) =>
        asset.available ? (
          <a
            key={asset.id}
            href={asset.downloadPath}
            onClick={onDownload}
            className={wizardPrimaryClassName}
          >
            <Download className="h-4 w-4" />
            {asset.id === "apk" ? "Télécharger l'app" : "Télécharger Anyloc"}
          </a>
        ) : (
          <span key={asset.id} className={wizardSecondaryClassName}>
            {asset.label} — bientôt disponible
          </span>
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
      <p className="text-sm text-zinc-400">
        Sur ce même téléphone, un bouton <strong className="text-white">Ouvrir Anyloc</strong> et un QR
        apparaissent ici. L&apos;app s&apos;ouvre déjà liée à ton compte.
      </p>
    );
  }

  if (creating || !createdToken) {
    return (
      <WizardStatusBox
        variant="searching"
        title="Préparation du lien…"
        hint="On génère le QR pour ton Android."
      />
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <WizardStatusBox variant="error" title={error} />
        <WizardPrimaryButton onClick={() => void createToken()}>
          Réessayer
        </WizardPrimaryButton>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Sur ce même téléphone, appuie sur le bouton. Sinon, scanne le carré avec
        l&apos;appareil photo.
      </p>
      {mobileSetupLink ? (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <SetupQrCode
            value={mobileSetupLink}
            label="Scanne avec l'appareil photo"
          />
          <a href={mobileSetupLink} className={`w-full sm:flex-1 ${wizardPrimaryClassName}`}>
            <Smartphone className="h-4 w-4" />
            Ouvrir Anyloc sur mon tel
          </a>
        </div>
      ) : null}

      <HelpDetails title="Le bouton ne marche pas ? Copie le code à la main">
        <code className="block break-all rounded-lg bg-black/40 px-3 py-2 text-xs text-zinc-200">
          {createdToken.token}
        </code>
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2 text-sm font-semibold text-white"
          onClick={() => void copyToken()}
        >
          <Copy className="h-4 w-4" />
          {copied ? "Copié" : "Copier le code"}
        </button>
        <p className="mt-2 text-xs text-zinc-500">
          Colle-le dans l&apos;app Anyloc, dans le champ prévu.
        </p>
      </HelpDetails>
    </div>
  );
}

function DeviceHandoff({
  href,
  title,
  description,
  copyLabel,
  qrLabel,
}: {
  href: string;
  title: string;
  description: string;
  copyLabel: string;
  qrLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const mailHref = `mailto:?subject=${encodeURIComponent("Anyloc — ouvre ça sur l'autre appareil")}&body=${encodeURIComponent(`Ouvre ce lien :\n${href}`)}`;

  const copy = async () => {
    await navigator.clipboard.writeText(href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <WizardStatusBox title={title} hint={description} />
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {qrLabel ? <SetupQrCode value={href} label={qrLabel} /> : null}
        <div className="flex w-full flex-1 flex-col gap-2">
          <WizardPrimaryButton onClick={() => void copy()}>
            <Copy className="h-4 w-4" />
            {copied ? "Lien copié" : copyLabel}
          </WizardPrimaryButton>
          <a href={mailHref} className={wizardSecondaryClassName}>
            <Mail className="h-4 w-4" />
            Se l&apos;envoyer par mail
          </a>
        </div>
      </div>
    </div>
  );
}

function PlatformToggle({
  platform,
  onChange,
}: {
  platform: Platform;
  onChange: (platform: Platform) => void;
}) {
  return (
    <div className="mb-6 flex gap-2 rounded-2xl border border-white/10 bg-white/5 p-1.5">
      {(["ios", "android"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
            platform === value
              ? "bg-white/10 text-pink-400 shadow-sm"
              : "text-zinc-400 hover:text-white"
          )}
        >
          <Smartphone className="h-4 w-4" />
          {value === "ios" ? "iPhone" : "Android"}
        </button>
      ))}
    </div>
  );
}

export function InstallationGuideView({
  embedded = false,
  preview = false,
}: { embedded?: boolean; preview?: boolean } = {}) {
  const searchParams = useSearchParams();
  const { data, loading, error: downloadsError } = useDownloads();
  const { completeStep, state } = useDashboardOnboarding();
  const urlPlatform = searchParams.get("platform");
  const platformFromUrl =
    urlPlatform === "android" || urlPlatform === "ios" ? urlPlatform : null;
  const detectedPlatform = useSyncExternalStore(
    () => () => {},
    detectDefaultPlatform,
    () => "ios" as Platform
  );
  const device = useSyncExternalStore(
    () => () => {},
    getClientDeviceSnapshot,
    () => SERVER_CLIENT_DEVICE
  );
  const [manualPlatform, setManualPlatform] = useState<Platform | null>(null);
  const { session, patch } = useInstallWizardSession();
  const platform =
    manualPlatform ?? session?.platform ?? platformFromUrl ?? detectedPlatform;
  const step = session?.step ?? 1;
  const downloaded = session?.downloaded ?? false;
  const passwordGate = session?.passwordGate ?? false;
  const iosInstallConfirmed = session?.iosInstallConfirmed ?? false;
  const [replaying, setReplaying] = useState(false);
  const [desktopOs, setDesktopOs] = useState<DesktopOs | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.sessionStorage.getItem(PAYMENT_SUCCESS_SESSION_KEY) === "true";
  });

  const resolvedOs = desktopOs ?? device.desktopOs;
  const installUrl = getInstallPageUrl(platform);
  const forcePhone = preview && searchParams.get("device") === "phone";
  const forceComputer = preview && searchParams.get("device") === "computer";
  const isPhone = forcePhone || (!forceComputer && device.isPhone);
  const needsSetupPassword = preview || Boolean(data?.needsSetupPassword);
  const hasAccess = preview || (data?.hasAccess ?? false);
  const alreadyDone = !replaying && state.steps.install;
  const zipDownloadPath = data?.assets.find(
    (asset) => asset.id === "setup-win-zip" && asset.available
  )?.downloadPath;

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

  const persist = useCallback(
    (partial: Parameters<typeof patch>[0]) => {
      patch({ platform, ...partial });
    },
    [patch, platform]
  );

  const goToStep = useCallback(
    (next: number) => {
      persist({
        step: Math.min(Math.max(next, 1), WIZARD_TOTAL_STEPS),
        passwordGate: false,
      });
    },
    [persist]
  );

  const handleStart = () => {
    if (needsSetupPassword) {
      persist({ step: 2, passwordGate: true });
      return;
    }
    goToStep(2);
  };

  const handlePasswordDone = useCallback(() => {
    persist({ step: 2, passwordGate: false });
  }, [persist]);

  const handleSkip = () => {
    completeStep("install");
    clearInstallWizardSession();
    setReplaying(false);
  };

  const handleComplete = () => {
    completeStep("install");
    clearInstallWizardSession();
    setReplaying(false);
  };

  const handleReplay = () => {
    setReplaying(true);
    persist({
      step: 1,
      downloaded: false,
      iosInstallConfirmed: false,
      passwordGate: false,
    });
  };

  const handlePlatformChange = (next: Platform) => {
    setManualPlatform(next);
    patch({
      platform: next,
      downloaded: false,
      step: session?.step ?? 1,
      passwordGate: false,
    });
  };

  const showDone = alreadyDone;

  function renderWelcome() {
    const ios = platform === "ios";

    return (
      <WizardShell
        step={1}
        icon={MapPin}
        title="Bienvenue sur Anyloc"
        subtitle={
          ios
            ? "Configure ton iPhone en quelques minutes. On te guide étape par étape."
            : "Configure ton Android en quelques minutes. On te guide étape par étape."
        }
        footer={
          <>
            <WizardPrimaryButton onClick={handleStart}>C&apos;est parti</WizardPrimaryButton>
            <WizardSkipButton onClick={handleSkip}>
              {ios
                ? "J'ai déjà configuré mon iPhone"
                : "J'ai déjà configuré mon Android"}
            </WizardSkipButton>
          </>
        }
      >
        {paymentSuccess ? (
          <p className="mb-4 text-sm font-medium text-emerald-400">
            Paiement confirmé — on y va.
          </p>
        ) : null}
        <PlatformToggle platform={platform} onChange={handlePlatformChange} />
        <WizardChecklist
          title="Ce dont tu as besoin"
          items={
            ios
              ? [
                  "Un iPhone (iOS 17, 18 ou 26)",
                  "Un câble USB",
                  resolvedOs === "win" ? "Ce PC Windows" : "Ce Mac",
                  "5 minutes",
                ]
              : [
                  "Un téléphone Android",
                  "5 minutes",
                  "Pas besoin d'ordinateur",
                ]
          }
        />
      </WizardShell>
    );
  }

  function renderPasswordGate() {
    return (
      <WizardShell
        step={2}
        icon={KeyRound}
        title="Choisis un mot de passe"
        subtitle="Tu as payé sans en créer un. Sans ça, Anyloc affiche « email ou mot de passe incorrect »."
        onBack={() => goToStep(1)}
        footer={
          <p className="text-center text-xs text-zinc-500">
            Enregistre-le pour débloquer l&apos;étape suivante.
          </p>
        }
      >
        <div className="overflow-hidden rounded-2xl bg-white">
          <SetupPasswordForm preview={preview} onSuccess={handlePasswordDone} />
        </div>
      </WizardShell>
    );
  }

  function renderIosDownload() {
    if (isPhone) {
      return (
        <WizardShell
          step={2}
          icon={Monitor}
          title="Ouvre cette page sur l'ordinateur"
          subtitle="Anyloc est un programme d'ordinateur. Si tu le télécharges ici, le fichier ne s'ouvre pas."
          onBack={() => goToStep(1)}
          footer={
            <>
              <WizardPrimaryButton onClick={() => goToStep(3)}>
                J&apos;ai ouvert le lien sur l&apos;ordi
              </WizardPrimaryButton>
              <WizardSkipButton onClick={() => goToStep(3)}>
                Continuer quand même
              </WizardSkipButton>
            </>
          }
        >
          <DeviceHandoff
            href={installUrl}
            title="Tu es sur ton téléphone"
            description="Ouvre ce lien sur ton Mac ou ton PC, puis télécharge Anyloc."
            copyLabel="Copier le lien pour l'ordinateur"
            qrLabel="Scanne depuis l'ordinateur"
          />
        </WizardShell>
      );
    }

    const toolsReady = downloaded && hasAccess;
    const toolsError = Boolean(downloadsError);

    return (
      <WizardShell
        step={2}
        icon={Monitor}
        title="Préparation des outils"
        subtitle="Télécharge Anyloc. L'app installera ensuite tout ce qu'il faut pour parler à ton iPhone."
        onBack={() => goToStep(1)}
        footer={
          <>
            <WizardPrimaryButton
              disabled={!toolsReady}
              onClick={() => goToStep(3)}
            >
              Continuer
            </WizardPrimaryButton>
            {toolsError ? (
              <WizardSecondaryButton onClick={() => persist({ downloaded: false })}>
                Réessayer
              </WizardSecondaryButton>
            ) : null}
            {downloaded ? null : (
              <WizardSkipButton
                onClick={() => {
                persist({ downloaded: true, step: 3, passwordGate: false });
                }}
              >
                J&apos;ai déjà le fichier
              </WizardSkipButton>
            )}
          </>
        }
      >
        {loading && !preview ? (
          <WizardStatusBox
            variant="searching"
            title="Vérification en cours..."
            hint="Ça peut prendre 1-2 minutes la première fois."
          />
        ) : toolsError ? (
          <WizardStatusBox
            variant="error"
            title="Impossible de préparer le téléchargement."
            hint="Réessaie, ou passe par le guide si ça bloque."
          />
        ) : toolsReady ? (
          <WizardStatusBox
            variant="ok"
            title="Fichier téléchargé"
            hint="Il est dans Téléchargements. Passe à l'étape suivante pour l'ouvrir."
          />
        ) : (
          <WizardStatusBox
            variant="idle"
            title="Prêt à télécharger"
            hint={
              resolvedOs === "win"
                ? "Windows va dire « Faites attention ». Clique Conserver — ce n'est pas un virus."
                : "Un seul fichier. Il va dans Téléchargements — il ne s'ouvre pas tout seul."
            }
          />
        )}

        <div className="mt-4 space-y-3">
          <DownloadButtons
            assetIds={resolvedOs === "win" ? ["setup-win"] : ["setup-mac"]}
            hasAccess={hasAccess}
            preview={preview}
            onDownload={() => persist({ downloaded: true })}
            data={data}
            loading={loading}
            error={downloadsError}
          />
          <button
            type="button"
            className="text-xs font-medium text-pink-400 underline-offset-2 hover:underline"
            onClick={() =>
              setDesktopOs(resolvedOs === "mac" ? "win" : "mac")
            }
          >
            {resolvedOs === "mac" ? "J'ai un PC Windows" : "J'ai un Mac"}
          </button>
        </div>
      </WizardShell>
    );
  }

  function renderIosOpen() {
    return (
      <WizardShell
        step={3}
        icon={Download}
        title="Ouvre Anyloc"
        subtitle="Le fichier ne s'ouvre pas tout seul. Fais ça, puis reviens valider."
        onBack={() => goToStep(2)}
        footer={
          <WizardPrimaryButton onClick={() => goToStep(4)}>
            J&apos;ai ouvert Anyloc
          </WizardPrimaryButton>
        }
      >
        {resolvedOs === "mac" ? (
          <>
            <WizardInstruction number={1} title="Double-clique le fichier">
              Une fenêtre s&apos;ouvre — on dirait un dossier.
            </WizardInstruction>
            <WizardInstruction number={2} title="Glisse Anyloc sur Applications">
              Dépose l&apos;icône Anyloc dans le dossier Applications.
            </WizardInstruction>
            <WizardInstruction number={3} title="Clic droit → Ouvrir → Ouvrir">
              Pas un double-clic. Sinon macOS peut dire « endommagé ».
            </WizardInstruction>
          </>
        ) : (
          <>
            <WizardInstruction number={1} title="Chrome : flèche ▾ → Conserver">
              Ne clique pas sur Jeter. Ce n&apos;est pas un virus.
            </WizardInstruction>
            <WizardInstruction number={2} title="Double-clique Anyloc-Setup">
              Le fichier est dans Téléchargements.
            </WizardInstruction>
            <WizardInstruction number={3} title="Plus d'infos → Exécuter quand même">
              Pas le bouton OK. Windows bloque les apps hors Store.
            </WizardInstruction>
          </>
        )}
        <div className="mt-4">
          <HelpDetails title="Ça ne s'ouvre pas ?">
            <div className="rounded-xl bg-white p-3 text-zinc-800">
              {resolvedOs === "win" ? (
                <WindowsOpenHelp
                  compact
                  downloaded={downloaded}
                  zipDownloadPath={zipDownloadPath}
                />
              ) : (
                <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                  <li>
                    Réglages Mac → Confidentialité et sécurité →{" "}
                    <strong>Ouvrir quand même</strong>
                  </li>
                  <li>
                    Ou clic droit sur Anyloc → Ouvrir → Ouvrir
                  </li>
                </ol>
              )}
            </div>
          </HelpDetails>
        </div>
      </WizardShell>
    );
  }

  function renderIosConnect() {
    return (
      <WizardShell
        step={4}
        icon={Usb}
        iconPulse
        title="Branche ton iPhone"
        subtitle={
          <>
            Connecte ton iPhone avec le câble USB, puis appuie sur{" "}
            <strong className="text-white">Faire confiance</strong> sur l&apos;iPhone.
            L&apos;app Anyloc te guide ensuite.
          </>
        }
        onBack={() => goToStep(3)}
        footer={
          <WizardPrimaryButton onClick={() => goToStep(5)}>
            C&apos;est branché, je continue
          </WizardPrimaryButton>
        }
      >
        <WizardInstruction number={1} title="Branche le câble USB">
          Utilise le câble fourni avec ton iPhone (Lightning ou USB-C).
        </WizardInstruction>
        <WizardInstruction number={2} title="Appuie sur « Faire confiance »">
          Un popup apparaît sur l&apos;iPhone. Appuie sur{" "}
          <strong className="text-white">Faire confiance</strong> et entre ton code.
        </WizardInstruction>
        <WizardInstruction number={3} title="Active le mode développeur si demandé">
          Réglages → Confidentialité et sécurité → Mode développeur. L&apos;iPhone
          redémarre — c&apos;est normal.
        </WizardInstruction>
        <WizardTip>
          Laisse l&apos;iPhone branché et Anyloc ouvert sur l&apos;ordi. Si tu
          débranches, Snap revoit ta vraie position.
        </WizardTip>
      </WizardShell>
    );
  }

  function renderIosInstall() {
    if (iosInstallConfirmed || alreadyDone) {
      return renderDone();
    }

    return (
      <WizardShell
        step={5}
        icon={Smartphone}
        title="Installe l'app sur ton iPhone"
        subtitle="Dans Anyloc sur l'ordinateur, clique Installer. L'app se met directement sur le tel."
        onBack={() => goToStep(4)}
        footer={
          <WizardPrimaryButton onClick={() => persist({ iosInstallConfirmed: true })}>
            C&apos;est installé
          </WizardPrimaryButton>
        }
      >
        <WizardStatusBox
          title="Prêt à installer"
          hint="Un clic dans l'app ordinateur, et Anyloc apparaît sur l'iPhone."
        />
        <HelpDetails title="Dans ~7 jours, l'app iPhone s'arrête ?">
          <p>
            Normal (limite Apple). Installe <strong className="text-white">LocalDevVPN</strong>{" "}
            (App Store, gratuit), connecte le Wi-Fi, puis dans Anyloc iPhone :{" "}
            <strong className="text-white">Profil → Renouveler</strong>. Pas besoin de
            rebrancher l&apos;ordi.
          </p>
        </HelpDetails>
      </WizardShell>
    );
  }

  function renderAndroidDownload() {
    const onComputer = forceComputer || (!forcePhone && !device.isPhone);

    if (onComputer) {
      return (
        <WizardShell
          step={2}
          icon={Smartphone}
          title="Télécharge depuis ton Android"
          subtitle="L'app s'installe sur le téléphone. Si tu télécharges ici, le fichier ne s'ouvre pas."
          onBack={() => goToStep(1)}
          footer={
            <>
              <WizardPrimaryButton onClick={() => goToStep(3)}>
                J&apos;ai ouvert le lien sur mon Android
              </WizardPrimaryButton>
              <WizardSkipButton onClick={() => goToStep(3)}>
                Continuer quand même
              </WizardSkipButton>
            </>
          }
        >
          <DeviceHandoff
            href={installUrl}
            title="Tu es sur l'ordinateur"
            description="Ouvre ce lien dans Chrome sur ton Android, puis appuie sur Télécharger."
            copyLabel="Copier le lien"
            qrLabel="Scanne avec ton Android"
          />
        </WizardShell>
      );
    }

    const toolsReady = downloaded && hasAccess;

    return (
      <WizardShell
        step={2}
        icon={Download}
        title="Télécharge l'app"
        subtitle="Appuie, puis ouvre le fichier dans Téléchargements. Il ne s'installe pas tout seul."
        onBack={() => goToStep(1)}
        footer={
          <>
            <WizardPrimaryButton
              disabled={!toolsReady}
              onClick={() => goToStep(3)}
            >
              Continuer
            </WizardPrimaryButton>
            <WizardSkipButton
              onClick={() => {
                persist({ downloaded: true, step: 3, passwordGate: false });
              }}
            >
              J&apos;ai déjà l&apos;app
            </WizardSkipButton>
          </>
        }
      >
        {loading && !preview ? (
          <WizardStatusBox
            variant="searching"
            title="Vérification en cours..."
            hint="On prépare le fichier Android."
          />
        ) : toolsReady ? (
          <WizardStatusBox
            variant="ok"
            title="Fichier téléchargé"
            hint="Il est dans Téléchargements."
          />
        ) : (
          <WizardStatusBox
            title="Prêt à télécharger"
            hint="Le fichier s'appelle Anyloc.apk."
          />
        )}
        <div className="mt-4">
          <DownloadButtons
            assetIds={["apk"]}
            hasAccess={hasAccess}
            preview={preview}
            onDownload={() => persist({ downloaded: true })}
            data={data}
            loading={loading}
            error={downloadsError}
          />
        </div>
      </WizardShell>
    );
  }

  function renderAndroidInstall() {
    return (
      <WizardShell
        step={3}
        icon={Smartphone}
        title="Installe le fichier"
        subtitle="Le fichier ne s'ouvre pas tout seul. Fais ça, puis reviens valider."
        onBack={() => goToStep(2)}
        footer={
          <WizardPrimaryButton onClick={() => goToStep(4)}>
            C&apos;est installé
          </WizardPrimaryButton>
        }
      >
        <WizardInstruction number={1} title="Ouvre Téléchargements">
          Ou l&apos;app Fichiers.
        </WizardInstruction>
        <WizardInstruction number={2} title="Appuie sur Anyloc.apk">
          Android te demande d&apos;installer.
        </WizardInstruction>
        <WizardInstruction number={3} title="Autorise si Android bloque">
          Autorise ton navigateur à installer des apps inconnues, puis reviens
          sur le fichier.
        </WizardInstruction>
        <WizardInstruction number={4} title="Appuie sur Installer">
          Ensuite ouvre Anyloc.
        </WizardInstruction>
      </WizardShell>
    );
  }

  function renderAndroidLink() {
    return (
      <WizardShell
        step={4}
        icon={Smartphone}
        title="Lie l'app à ton compte"
        subtitle="L'app s'ouvre déjà liée. Si le bouton ne marche pas, scanne le carré."
        onBack={() => goToStep(3)}
        footer={
          <WizardPrimaryButton onClick={() => goToStep(5)}>
            J&apos;ai ouvert Anyloc
          </WizardPrimaryButton>
        }
      >
        <AndroidLinkStep preview={preview} />
        <WizardTip>
          L&apos;app te demande d&apos;autoriser la fausse position. Appuie sur
          ses boutons — tu n&apos;as pas à chercher dans les réglages tout seul.
        </WizardTip>
      </WizardShell>
    );
  }

  function renderAndroidFinish() {
    if (alreadyDone) {
      return renderDone();
    }

    return (
      <WizardShell
        step={5}
        icon={MapPin}
        title="Choisis une ville"
        subtitle="Cherche une ville dans l'app (Marbella, Paris…), puis ouvre Snap ou Maps."
        onBack={() => goToStep(4)}
        footer={
          <WizardPrimaryButton onClick={handleComplete}>
            Oui, ça marche
          </WizardPrimaryButton>
        }
      >
        <WizardInstruction number={1} title="Cherche une ville dans l'app">
          Marbella, Paris, Miami…
        </WizardInstruction>
        <WizardInstruction number={2} title="Vérifie dans Snap ou Maps">
          La loc a changé. Si ce n&apos;est pas le cas, Anyloc doit être l&apos;app
          de localisation fictive.
        </WizardInstruction>
        <HelpDetails title="La loc ne change pas ?">
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>Dans l&apos;app, suis l&apos;écran « Encore 1 étape »</li>
            <li>Anyloc doit être l&apos;app de localisation fictive</li>
            <li>Active le GPS, puis ferme et rouvre Snap</li>
          </ol>
        </HelpDetails>
      </WizardShell>
    );
  }

  function renderDone() {
    return (
      <WizardShell
        step={5}
        icon={CheckCircle2}
        title="C'est prêt !"
        subtitle={
          platform === "ios"
            ? "Ouvre Anyloc sur ton iPhone et connecte-toi avec le même compte. Ta position se synchronise automatiquement."
            : "Ouvre Anyloc sur ton Android, choisis une ville, et vérifie dans Snap."
        }
        footer={
          <>
            <WizardPrimaryButton onClick={handleComplete}>
              Commencer à utiliser Anyloc
            </WizardPrimaryButton>
            <WizardSkipButton onClick={handleReplay}>
              Revoir le guide
            </WizardSkipButton>
          </>
        }
      >
        <WizardSuccessCard title="C'est prêt !">
          {platform === "ios" ? (
            <p>
              Ouvre <strong className="text-white">Anyloc</strong> sur ton iPhone
              et connecte-toi avec le <strong className="text-white">même compte</strong>.
              Ta position se synchronise automatiquement.
            </p>
          ) : (
            <p>
              L&apos;app est liée. Choisis une ville, puis ouvre Snap ou Maps pour
              vérifier.
            </p>
          )}
        </WizardSuccessCard>
        {data?.isAdmin ? (
          <p className="mt-4 text-center text-xs text-violet-300">
            Mode admin actif — accès dev sans abonnement.
          </p>
        ) : null}
      </WizardShell>
    );
  }

  function renderStep() {
    if (showDone && !replaying) {
      return renderDone();
    }

    if (step === 1) {
      return renderWelcome();
    }

    if (passwordGate) {
      return renderPasswordGate();
    }

    if (platform === "ios") {
      if (step === 2) return renderIosDownload();
      if (step === 3) return renderIosOpen();
      if (step === 4) return renderIosConnect();
      return renderIosInstall();
    }

    if (step === 2) return renderAndroidDownload();
    if (step === 3) return renderAndroidInstall();
    if (step === 4) return renderAndroidLink();
    return renderAndroidFinish();
  }

  return (
    <div className={embedded ? "" : "min-h-screen bg-zinc-950 text-white"}>
      {!embedded && <DashboardPageHeader tone="dark" />}

      <main className={embedded ? "" : "px-4 py-8 sm:px-6 lg:px-8"}>
        <div key={`${platform}-${passwordGate ? "password" : step}-${iosInstallConfirmed ? "done" : "flow"}`}>
          {renderStep()}
        </div>
      </main>
    </div>
  );
}
