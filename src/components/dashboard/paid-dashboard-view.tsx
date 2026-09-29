"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, Download, Loader2, Monitor } from "lucide-react";
import { DashboardAppHeader } from "@/components/dashboard/dashboard-app-header";
import { IphoneInstallView } from "@/components/dashboard/iphone-install-view";
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
  getClientDeviceSnapshot,
  SERVER_CLIENT_DEVICE,
  type DesktopOs,
} from "@/lib/platform";

/** Quelle app le client installe : décidé par son abonnement, pas par son appareil. */
export type InstallTrack = "iphone" | "desktop";

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
];

const DESKTOP_STEPS = [
  "Télécharge Anyloc sur ton ordi",
  "Ouvre l'app et branche ton iPhone en USB",
  "Choisis ta ville — c'est tout, vérifie dans Snap",
];

function getDashboardUrl() {
  if (typeof window === "undefined") {
    return "https://anyloc.io/dashboard";
  }

  return `${window.location.origin}/dashboard`;
}

function DesktopDownloadCard({
  preview,
  hasAccess,
  desktopOs,
  onDesktopOsChange,
  mac,
  windows,
  windowsZip,
  onDownload,
}: {
  preview: boolean;
  hasAccess: boolean;
  desktopOs: DesktopOs;
  onDesktopOsChange: (os: DesktopOs) => void;
  mac?: DownloadAssetInfo;
  windows?: DownloadAssetInfo;
  windowsZip?: DownloadAssetInfo;
  onDownload: (platform: string) => void;
}) {
  const asset = desktopOs === "win" ? windows : mac;
  const href = preview ? "#" : hasAccess ? asset?.downloadPath : undefined;

  return (
    <Card className="border-pink-200 bg-white p-6 sm:p-8">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
          <Monitor className="h-7 w-7" />
        </div>
        <div className="mt-6">
          {preview || (asset?.available && href) ? (
            <a href={href} onClick={() => onDownload(asset?.id ?? "setup")} className="block">
              <Button size="lg" className="w-full">
                <Download className="h-4 w-4" />
                {desktopOs === "win"
                  ? "Télécharger Anyloc pour Windows"
                  : "Télécharger Anyloc pour Mac"}
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
  track = "desktop",
}: {
  preview?: boolean;
  track?: InstallTrack;
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
  const [showDesktopOption, setShowDesktopOption] = useState(false);

  const assets = preview ? PREVIEW_ASSETS : data?.assets ?? [];
  const hasAccess = preview || (data?.hasAccess ?? false);
  const needsSetupPassword = !preview && Boolean(data?.needsSetupPassword);
  const mac = assets.find((asset) => asset.id === "setup-mac");
  const windows = assets.find((asset) => asset.id === "setup-win");
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

  const desktopCard =
    loading && !preview ? (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Préparation…
      </div>
    ) : error && !preview ? (
      <p className="text-center text-sm text-red-600">{error}</p>
    ) : (
      <DesktopDownloadCard
        preview={preview}
        hasAccess={hasAccess}
        desktopOs={desktopOs}
        onDesktopOsChange={setDesktopOs}
        mac={mac}
        windows={windows}
        windowsZip={windowsZip}
        onDownload={handleDownload}
      />
    );

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

      <main className="relative mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        {paymentSuccess ? (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-4 w-4" />
            </span>
            <p className="font-semibold text-emerald-950">
              Paiement confirmé — ton accès est actif.
            </p>
          </div>
        ) : null}

        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            {track === "iphone"
              ? "Installe Anyloc sur ton iPhone"
              : "Installe Anyloc sur ton ordi"}
          </h1>
          <p className="mt-3 text-sm text-zinc-600 sm:text-base">
            {track === "iphone"
              ? "Directement sur le téléphone, sans ordi ni câble."
              : "3 étapes, 10 minutes. Ensuite tout se passe dans l'app."}
          </p>
        </div>

        {needsSetupPassword ? (
          <div className="mt-8">
            <SetupPasswordForm preview={preview} />
          </div>
        ) : null}

        {track === "iphone" ? (
          <>
            <div className="mt-8">
              <IphoneInstallView embedded />
            </div>

            <div className="mt-8 text-center">
              <button
                type="button"
                className="text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline"
                onClick={() => setShowDesktopOption((value) => !value)}
              >
                Tu préfères passer par un ordi (Mac ou PC) ?
              </button>
            </div>
            {showDesktopOption ? <div className="mt-4">{desktopCard}</div> : null}
          </>
        ) : (
          <>
            <ol className="mt-8 space-y-3">
              {DESKTOP_STEPS.map((step, index) => (
                <li
                  key={step}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-500 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm font-medium text-zinc-900">{step}</p>
                </li>
              ))}
            </ol>

            {device.isPhone ? (
              <div className="mt-8">
                <WrongDeviceNotice
                  title="Ouvre cette page sur ton Mac ou PC"
                  href={getDashboardUrl()}
                  copyLabel="Copier le lien"
                >
                  <p>L&apos;app Anyloc s&apos;installe sur un ordinateur.</p>
                </WrongDeviceNotice>
              </div>
            ) : null}

            <div className="mt-8">{desktopCard}</div>
          </>
        )}

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
