"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check,
  Download,
  Loader2,
  Monitor,
  Smartphone,
} from "lucide-react";
import { DashboardAppHeader } from "@/components/dashboard/dashboard-app-header";
import { SetupPasswordForm } from "@/components/dashboard/setup-password-form";
import { WrongDeviceNotice } from "@/components/dashboard/setup-open-help";
import { WindowsOpenHelp } from "@/components/dashboard/windows-open-help";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAccount } from "@/hooks/use-account";
import { useDownloads, type DownloadAssetInfo } from "@/hooks/use-downloads";
import { usePaymentSuccess } from "@/hooks/use-payment-success";
import { capturePostHogClientEvent } from "@/lib/posthog/browser";
import { formatSubscriptionStatusLabel } from "@/lib/account-billing-types";
import { getPlanDisplayName } from "@/lib/constants";
import { dashboardHref, getDashboardBasePath } from "@/lib/dashboard-paths";
import {
  COMPETITOR_ONBOARDING_STEPS,
  getOnboardingMode,
  getPrimaryActionLabel,
} from "@/lib/onboarding-flow";
import {
  getClientDeviceSnapshot,
  SERVER_CLIENT_DEVICE,
  type DesktopOs,
} from "@/lib/platform";
import { cn } from "@/lib/utils";

const PREVIEW_ASSETS: DownloadAssetInfo[] = [
  {
    id: "setup-mac",
    label: "Anyloc (Mac)",
    description: "macOS Ventura ou plus récent",
    filename: "Anyloc.dmg",
    available: true,
    downloadPath: "#",
  },
  {
    id: "setup-win",
    label: "Anyloc (Windows)",
    description: "Windows 10 ou plus récent",
    filename: "Anyloc-Setup.exe",
    available: true,
    downloadPath: "#",
  },
  {
    id: "apk",
    label: "Anyloc (Android)",
    description: "APK Android",
    filename: "Anyloc.apk",
    available: true,
    downloadPath: "#",
  },
];

function getDashboardUrl() {
  if (typeof window === "undefined") {
    return "https://anyloc.io/dashboard";
  }

  return `${window.location.origin}/dashboard`;
}

function JourneyStepper({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {COMPETITOR_ONBOARDING_STEPS.map((step, index) => {
        const stepNumber = (index + 1) as 1 | 2 | 3;
        const done = stepNumber < currentStep;
        const active = stepNumber === currentStep;

        return (
          <li
            key={step.id}
            className={cn(
              "rounded-2xl border px-4 py-4",
              done && "border-emerald-200 bg-emerald-50/80",
              active && "border-pink-300 bg-white shadow-sm ring-2 ring-pink-100",
              !done && !active && "border-zinc-200 bg-zinc-50/80"
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                  done && "bg-emerald-500 text-white",
                  active && "bg-pink-500 text-white",
                  !done && !active && "bg-zinc-200 text-zinc-600"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : stepNumber}
              </span>
              <p className="text-sm font-semibold text-zinc-900">{step.title}</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              {step.description}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function PrimaryInstallCard({
  preview,
  hasAccess,
  mode,
  desktopOs,
  onDesktopOsChange,
  mac,
  windows,
  android,
  windowsZip,
  onDownload,
}: {
  preview: boolean;
  hasAccess: boolean;
  mode: ReturnType<typeof getOnboardingMode>;
  desktopOs: DesktopOs;
  onDesktopOsChange: (os: DesktopOs) => void;
  mac?: DownloadAssetInfo;
  windows?: DownloadAssetInfo;
  android?: DownloadAssetInfo;
  windowsZip?: DownloadAssetInfo;
  onDownload: (platform: string) => void;
}) {
  const label = getPrimaryActionLabel(mode, desktopOs);

  if (mode === "android-phone") {
    const href = preview ? "#" : android?.downloadPath;

    return (
      <Card className="border-pink-200 bg-white p-6 sm:p-8">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
            <Smartphone className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-zinc-900">
            Installe l&apos;app sur ton Android
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Tout se passe sur ton téléphone. L&apos;app te guide écran par écran.
          </p>
          <div className="mt-6">
            {preview || (hasAccess && android?.available && href) ? (
              <a href={href} onClick={() => onDownload("apk")} className="block">
                <Button size="lg" className="w-full">
                  <Download className="h-4 w-4" />
                  {label}
                </Button>
              </a>
            ) : (
              <Button size="lg" className="w-full" disabled>
                APK bientôt disponible
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (mode === "ios-phone") {
    return (
      <Card className="border-pink-200 bg-white p-6 sm:p-8">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
            <Smartphone className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-zinc-900">
            Ta télécommande iPhone
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Rien à installer : ouvre-la dans Safari puis{" "}
            <strong>Partager → Sur l&apos;écran d&apos;accueil</strong>. Le GPS
            se change ensuite via Anyloc Setup sur un ordi (USB).
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/app" className="w-full sm:w-auto">
              <Button size="lg" className="h-12 w-full px-8 text-base sm:w-auto">
                <Smartphone className="h-4 w-4" />
                Ouvrir la télécommande
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            Pas encore configuré ? Ouvre cette page sur un Mac ou PC pour
            télécharger Anyloc Setup.
          </p>
        </div>
      </Card>
    );
  }

  const asset = desktopOs === "win" ? windows : mac;
  const href = preview ? "#" : hasAccess ? asset?.downloadPath : undefined;

  return (
    <Card className="border-pink-200 bg-white p-6 sm:p-8">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
          <Download className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-zinc-900">
          Télécharge Anyloc Setup
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Ouvre l&apos;app sur ton ordi — le tutoriel complet (USB, install,
          première ville) est dedans, pas sur ce site.
        </p>
        <div className="mt-6">
          {preview || (asset?.available && href) ? (
            <a href={href} onClick={() => onDownload(asset?.id ?? "setup")} className="block">
              <Button size="lg" className="w-full">
                <Download className="h-4 w-4" />
                {label}
              </Button>
            </a>
          ) : (
            <Button size="lg" className="w-full" disabled>
              Bientôt disponible
            </Button>
          )}
        </div>
        <button
          type="button"
          className="mt-4 text-xs font-medium text-pink-600 underline-offset-2 hover:underline"
          onClick={() => onDesktopOsChange(desktopOs === "mac" ? "win" : "mac")}
        >
          {desktopOs === "mac" ? "J'ai un PC Windows" : "J'ai un Mac"}
        </button>
        {desktopOs === "win" ? (
          <div className="mt-4 text-left">
            <WindowsOpenHelp compact zipDownloadPath={windowsZip?.downloadPath} />
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export function PaidDashboardView({
  preview = false,
}: {
  preview?: boolean;
} = {}) {
  const pathname = usePathname();
  const basePath = getDashboardBasePath(pathname);
  const paymentSuccess = usePaymentSuccess();
  const { data, loading, error } = useDownloads();
  const { data: account } = useAccount();
  const device = useSyncExternalStore(
    () => () => {},
    getClientDeviceSnapshot,
    () => SERVER_CLIENT_DEVICE
  );
  const [desktopOs, setDesktopOs] = useState<DesktopOs>(device.desktopOs);

  const mode = getOnboardingMode(device);
  const assets = preview ? PREVIEW_ASSETS : data?.assets ?? [];
  const hasAccess = preview || (data?.hasAccess ?? false);
  const needsSetupPassword = !preview && Boolean(data?.needsSetupPassword);
  const mac = assets.find((asset) => asset.id === "setup-mac");
  const windows = assets.find((asset) => asset.id === "setup-win");
  const android = assets.find((asset) => asset.id === "apk" && !asset.hidden);
  const windowsZip = assets.find(
    (asset) => asset.id === "setup-win-zip" && asset.available
  );

  const planLabel = useMemo(() => {
    if (preview) {
      return "Plan annuel";
    }

    return (
      getPlanDisplayName(account?.planId) ??
      account?.planName ??
      "Abonnement"
    );
  }, [account?.planId, account?.planName, preview]);

  const statusLabel = preview
    ? "Abonnement actif"
    : formatSubscriptionStatusLabel(
        account?.isAdmin
          ? "admin"
          : account?.isClipper
            ? "clipper"
            : (account?.subscriptionStatus ?? null)
      );

  function handleDownload(platform: string) {
    capturePostHogClientEvent("app_downloaded", { platform, source: "dashboard" });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-pink-500/10 blur-[120px]" />
        <div className="absolute top-40 right-0 h-[280px] w-[360px] rounded-full bg-violet-500/10 blur-[100px]" />
      </div>

      <DashboardAppHeader
        planLabel={planLabel}
        statusLabel={statusLabel}
        activeTab="home"
      />

      <main className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {paymentSuccess ? (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold text-emerald-950">Paiement confirmé</p>
              <p className="mt-1 text-sm text-emerald-900/90">
                Étape 1 terminée. Télécharge l&apos;app — le reste se fait dedans.
              </p>
            </div>
          </div>
        ) : null}

        <div className="text-center">
          <p className="text-sm font-medium text-pink-600">Opérationnel en 3 étapes</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {mode === "android-phone"
              ? "Tout se passe sur ton Android"
              : mode === "ios-phone"
                ? "Installe l'app sur ton iPhone"
                : "Télécharge Anyloc Setup"}
          </h1>
          <p className="mt-3 text-sm text-zinc-600 sm:text-base">
            {mode === "desktop"
              ? "Ce site sert à payer et télécharger. Le tutoriel complet vit dans Anyloc Setup."
              : "Ensuite, tu changes de ville depuis l'app — plus besoin de revenir ici."}
          </p>
        </div>

        <div className="mt-8">
          <JourneyStepper currentStep={2} />
        </div>

        {needsSetupPassword ? (
          <div className="mt-8">
            <SetupPasswordForm preview={preview} />
          </div>
        ) : null}

        {mode === "ios-phone" ? (
          <div className="mt-8">
            <WrongDeviceNotice
              title="Plan B : ouvre cette page sur un Mac ou PC"
              href={getDashboardUrl()}
              copyLabel="Copier le lien"
              qrLabel="Scanne depuis l'ordi"
            >
              <p>
                L&apos;installation complète (USB + tutoriel) se fait dans Anyloc
                Setup sur ordinateur.
              </p>
            </WrongDeviceNotice>
          </div>
        ) : null}

        {mode === "desktop" ? (
          <p className="mt-6 text-center text-sm text-zinc-500">
            Tu es sur Android ? Ouvre{" "}
            <span className="font-medium text-zinc-700">anyloc.io/dashboard</span>{" "}
            sur ton téléphone.
          </p>
        ) : null}

        <div className="mt-8">
          {loading && !preview ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Préparation…
            </div>
          ) : error && !preview ? (
            <p className="text-center text-sm text-red-600">{error}</p>
          ) : (
            <PrimaryInstallCard
              preview={preview}
              hasAccess={hasAccess}
              mode={mode}
              desktopOs={desktopOs}
              onDesktopOsChange={setDesktopOs}
              mac={mac}
              windows={windows}
              android={android}
              windowsZip={windowsZip}
              onDownload={handleDownload}
            />
          )}
        </div>

        {mode === "desktop" ? (
          <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <Monitor className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Ensuite, ouvre Anyloc Setup
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  L&apos;app te guide pas à pas : branche l&apos;iPhone, installe
                  l&apos;app, choisis ta première ville, vérifie dans Snap. Tout
                  est dans le tutoriel intégré — rien à refaire sur ce site.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <p className="mt-8 text-center text-sm text-zinc-500">
          Factures et abonnement dans{" "}
          <Link
            href={dashboardHref(basePath, "account")}
            className="font-medium text-pink-600 hover:underline"
          >
            Mon compte
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
