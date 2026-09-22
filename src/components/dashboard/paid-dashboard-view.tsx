"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check,
  Download,
  Laptop,
  Loader2,
  MapPin,
  Monitor,
  Smartphone,
} from "lucide-react";
import { DashboardMenu } from "@/components/dashboard/dashboard-menu";
import { SetupPasswordForm } from "@/components/dashboard/setup-password-form";
import { WrongDeviceNotice } from "@/components/dashboard/setup-open-help";
import { WindowsOpenHelp } from "@/components/dashboard/windows-open-help";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/hooks/use-account";
import { useDownloads, type DownloadAssetInfo } from "@/hooks/use-downloads";
import { usePaymentSuccess } from "@/hooks/use-payment-success";
import { capturePostHogClientEvent } from "@/lib/posthog/browser";
import {
  formatSubscriptionStatusLabel,
} from "@/lib/account-billing-types";
import { getPlanDisplayName } from "@/lib/constants";
import {
  dashboardHref,
  getDashboardBasePath,
} from "@/lib/dashboard-paths";
import {
  getClientDeviceSnapshot,
  SERVER_CLIENT_DEVICE,
} from "@/lib/platform";
import { cn } from "@/lib/utils";

const SETUP_STEPS = [
  {
    number: "1",
    title: "Installe Anyloc sur ton ordi",
    description:
      "Télécharge la version Mac ou Windows. Une seule fois — c’est l’app qui installe le GPS sur l’iPhone.",
  },
  {
    number: "2",
    title: "Branche ton iPhone",
    description:
      "Câble USB, déverrouille, appuie Faire confiance, puis clique Installer dans Anyloc.",
  },
  {
    number: "3",
    title: "Choisis une ville",
    description:
      "Marbella, Paris, Miami… Snap, Maps et tes apps suivent tout de suite.",
  },
] as const;

const PREVIEW_ASSETS: DownloadAssetInfo[] = [
  {
    id: "setup-mac",
    label: "Anyloc (Mac)",
    description: "macOS Ventura ou plus récent — branche ton iPhone et installe en un clic",
    filename: "Anyloc.dmg",
    available: true,
    downloadPath: "#",
  },
  {
    id: "setup-win",
    label: "Anyloc (Windows)",
    description: "Windows 10 ou plus récent — branche ton iPhone et installe en un clic",
    filename: "Anyloc-Setup.exe",
    available: true,
    downloadPath: "#",
  },
  {
    id: "apk",
    label: "Anyloc (Android)",
    description: "APK signé pour installation directe sur Android",
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

function AppleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.7 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-0.8-3-0.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.9ZM14.6 6.3c.6-.8 1.1-1.9.9-3-0.9.1-2 .6-2.7 1.4-.6.7-1.2 1.8-1 2.9 1 .1 2-.5 2.8-1.3Z"
      />
    </svg>
  );
}

function WindowsMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 5.4 10.2 4.3v7.1H3V5.4Zm8.1-1.3L21 2.5v9H11.1V4.1ZM3 13.2h7.2v7.1L3 19.2v-6Zm8.1 0H21v8.3l-9.9-1.5v-6.8Z"
      />
    </svg>
  );
}

function DownloadCard({
  title,
  subtitle,
  filename,
  href,
  available,
  recommended,
  preview,
  icon: Icon,
  onDownload,
}: {
  title: string;
  subtitle: string;
  filename: string;
  href?: string;
  available: boolean;
  recommended?: boolean;
  preview: boolean;
  icon: typeof AppleMark;
  onDownload?: () => void;
}) {
  const button = (
    <Button
      className="w-full"
      disabled={!preview && !available}
      onClick={onDownload}
    >
      <Download className="h-4 w-4" />
      {available || preview ? "Télécharger" : "Bientôt disponible"}
    </Button>
  );

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-3xl border bg-white p-6 shadow-sm sm:p-7",
        recommended
          ? "border-pink-300 ring-2 ring-pink-200/80"
          : "border-zinc-200"
      )}
    >
      {recommended ? (
        <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
          Ton ordi
        </span>
      ) : null}

      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
          <p className="text-sm text-zinc-500">{subtitle}</p>
        </div>
      </div>

      <p className="mt-5 text-xs text-zinc-400">{filename}</p>

      <div className="mt-4">
        {preview || !href || !available ? (
          button
        ) : (
          <a href={href} onClick={onDownload} className="block">
            {button}
          </a>
        )}
      </div>
    </article>
  );
}

function DashboardHeader({
  planLabel,
  statusLabel,
  basePath,
}: {
  planLabel: string;
  statusLabel: string;
  basePath: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="lg:hidden">
            <DashboardMenu />
          </div>
          <Logo nameClassName="text-base font-bold" />
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          <Link
            href={dashboardHref(basePath)}
            className="rounded-xl px-3 py-2 text-sm font-medium text-pink-600"
          >
            Dashboard
          </Link>
          <Link
            href={dashboardHref(basePath, "install")}
            className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
          >
            Installation
          </Link>
          <Link
            href={dashboardHref(basePath, "account")}
            className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
          >
            Mon compte
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 sm:inline">
            {statusLabel}
          </span>
          <span className="hidden rounded-full border border-pink-200 bg-pink-50 px-2.5 py-1 text-[11px] font-semibold text-pink-700 md:inline">
            {planLabel}
          </span>
        </div>
      </div>
    </header>
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
        account?.isAdmin ? "admin" : (account?.subscriptionStatus ?? null)
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

      <DashboardHeader
        planLabel={planLabel}
        statusLabel={statusLabel}
        basePath={basePath}
      />

      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        {paymentSuccess ? (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 sm:px-5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold text-emerald-950">Paiement confirmé</p>
              <p className="mt-1 text-sm text-emerald-900/90">
                Ton accès est actif. Télécharge Anyloc, branche ton iPhone, choisis
                une ville.
              </p>
            </div>
          </div>
        ) : null}

        <div className="max-w-3xl">
          <p className="text-sm font-medium text-pink-600">
            {paymentSuccess ? "Bienvenue sur Anyloc" : "Ton espace"}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-5xl sm:leading-[1.1]">
            Change ta position.
          </h1>
          <p className="mt-4 text-base text-zinc-600 sm:text-lg">
            Télécharge Anyloc sur Mac ou Windows, branche ton iPhone une fois,
            puis choisis n’importe quelle ville. Snap, Insta, Maps : tout le tel
            suit.
          </p>
        </div>

        {needsSetupPassword ? (
          <div className="mt-8 max-w-xl">
            <SetupPasswordForm preview={preview} />
          </div>
        ) : null}

        {device.isPhone ? (
          <div className="mt-8">
            <WrongDeviceNotice
              title="Ouvre cette page sur ton Mac ou PC"
              href={getDashboardUrl()}
              copyLabel="Copier le lien"
              qrLabel="Scanne depuis l’ordi"
            >
              <p>
                L’app iPhone s’installe depuis l’ordinateur, pas depuis Safari
                sur le téléphone.
              </p>
            </WrongDeviceNotice>
          </div>
        ) : null}

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl">
                Télécharge Anyloc
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Mac ou Windows — le même logiciel, pour brancher l’iPhone.
              </p>
            </div>
          </div>

          {loading && !preview ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Préparation des téléchargements…
            </div>
          ) : error && !preview ? (
            <p className="mt-6 text-sm text-red-600">{error}</p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <DownloadCard
                title="Mac"
                subtitle="macOS Ventura ou plus récent"
                filename={mac?.filename ?? "Anyloc.dmg"}
                href={hasAccess ? mac?.downloadPath : undefined}
                available={Boolean(mac?.available)}
                recommended={!device.isPhone && device.desktopOs === "mac"}
                preview={preview}
                icon={AppleMark}
                onDownload={() => handleDownload("setup-mac")}
              />
              <DownloadCard
                title="Windows"
                subtitle="Windows 10 ou plus récent"
                filename={windows?.filename ?? "Anyloc-Setup.exe"}
                href={hasAccess ? windows?.downloadPath : undefined}
                available={Boolean(windows?.available)}
                recommended={!device.isPhone && device.desktopOs === "win"}
                preview={preview}
                icon={WindowsMark}
                onDownload={() => handleDownload("setup-win")}
              />
            </div>
          )}

          {!device.isPhone && device.desktopOs === "win" ? (
            <div className="mt-4">
              <WindowsOpenHelp
                compact
                zipDownloadPath={windowsZip?.downloadPath}
              />
            </div>
          ) : null}
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl">
            Mise en route
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Trois étapes. Après ça, tu pilotes ta loc depuis l’app.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {SETUP_STEPS.map((step) => (
              <article
                key={step.number}
                className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-sm font-bold text-pink-600">
                  {step.number}
                </div>
                <h3 className="mt-4 text-base font-semibold text-zinc-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">T’es sur Android ?</h3>
                <p className="text-sm text-zinc-500">
                  Pas besoin d’ordinateur. Installe l’APK sur le téléphone.
                </p>
              </div>
            </div>
            <div className="mt-5">
              {preview || (hasAccess && android?.available && android.downloadPath) ? (
                <a
                  href={preview ? "#" : android?.downloadPath}
                  onClick={() => handleDownload("apk")}
                >
                  <Button variant="secondary" className="w-full sm:w-auto">
                    <Download className="h-4 w-4" />
                    Télécharger l’APK
                  </Button>
                </a>
              ) : (
                <Button variant="secondary" disabled>
                  APK bientôt disponible
                </Button>
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">Besoin du détail ?</h3>
                <p className="text-sm text-zinc-500">
                  Le guide pas à pas, ou tes factures et ton mot de passe.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link href={dashboardHref(basePath, "install")}>
                <Button variant="secondary" className="w-full sm:w-auto">
                  <Laptop className="h-4 w-4" />
                  Guide d’installation
                </Button>
              </Link>
              <Link href={dashboardHref(basePath, "account")}>
                <Button variant="ghost" className="w-full sm:w-auto">
                  <Monitor className="h-4 w-4" />
                  Mon compte
                </Button>
              </Link>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
