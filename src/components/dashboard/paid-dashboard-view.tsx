"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Apple, Check, ChevronDown, Loader2, Monitor, Smartphone } from "lucide-react";
import { DashboardAppHeader } from "@/components/dashboard/dashboard-app-header";
import { IphoneInstallView } from "@/components/dashboard/iphone-install-view";
import { SetupPasswordForm } from "@/components/dashboard/setup-password-form";
import {
  AndroidOpenHelp,
  MacOpenHelp,
} from "@/components/dashboard/setup-open-help";
import { WindowsOpenHelp } from "@/components/dashboard/windows-open-help";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAccount } from "@/hooks/use-account";
import { useDownloads, type DownloadAssetInfo } from "@/hooks/use-downloads";
import { usePaymentSuccess } from "@/hooks/use-payment-success";
import { track as trackEvent } from "@/lib/analytics/track";
import { formatSubscriptionStatusLabel } from "@/lib/account-billing-types";
import { getPlanDisplayName } from "@/lib/constants";
import { dashboardHref, getDashboardBasePath } from "@/lib/dashboard-paths";
import {
  buildMobileSetupLink,
  getPendingTokenStorageKey,
  getPublicApiBaseUrl,
} from "@/lib/device-setup-link";
import { getClientDeviceSnapshot, SERVER_CLIENT_DEVICE } from "@/lib/platform";

/** L'abonnement du client inclut-il l'app iPhone sans ordi ? */
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
  {
    id: "apk",
    label: "Anyloc (Android)",
    description: "Android 8 ou plus récent",
    filename: "Anyloc.apk",
    available: true,
    downloadPath: "#",
  },
];

function StepCard({
  number,
  title,
  text,
  children,
}: {
  number: number;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-500 text-sm font-bold text-white">
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-zinc-900">{title}</p>
          <p className="mt-1 text-sm text-zinc-600">{text}</p>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </li>
  );
}

function DownloadButton({
  asset,
  label,
  icon: Icon,
  enabled,
  onDownload,
}: {
  asset?: DownloadAssetInfo;
  label: string;
  icon: typeof Monitor;
  enabled: boolean;
  onDownload: (platform: string) => void;
}) {
  if (!enabled || !asset?.available) {
    return (
      <Button size="lg" variant="secondary" className="w-full" disabled>
        <Icon className="h-4 w-4" />
        {label}
      </Button>
    );
  }

  return (
    <a href={asset.downloadPath} onClick={() => onDownload(asset.id)} className="block">
      <Button size="lg" className="w-full">
        <Icon className="h-4 w-4" />
        {label}
      </Button>
    </a>
  );
}

function HelpItem({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-t border-zinc-100 py-3 first:border-t-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-zinc-800 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 text-sm text-zinc-600">{children}</div>
    </details>
  );
}

type PendingToken = { token: string; apiBaseUrl: string };

/** The Android app links to the account through a one-time token, not a login. */
async function openAndroidApp() {
  const storageKey = getPendingTokenStorageKey("android");
  let pending: PendingToken | null = null;
  try {
    const cached = sessionStorage.getItem(storageKey);
    if (cached) pending = JSON.parse(cached) as PendingToken;
  } catch {
    pending = null;
  }

  if (!pending?.token?.startsWith("anyloc_")) {
    const response = await fetch("/api/device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "android", deviceName: "Mon Android" }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Impossible de connecter l'app.");
    }
    pending = { token: data.token, apiBaseUrl: data.apiBaseUrl ?? getPublicApiBaseUrl() };
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ ...pending, platform: "android" }));
    } catch {}
    trackEvent("device_link_created", { platform: "android", source: "dashboard" });
  }

  window.location.href = buildMobileSetupLink(pending.token, pending.apiBaseUrl);
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
  // Only decides where the "connect" button sends: the steps stay the same for everyone.
  const device = useSyncExternalStore(
    () => () => {},
    getClientDeviceSnapshot,
    () => SERVER_CLIENT_DEVICE
  );
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const assets = preview ? PREVIEW_ASSETS : data?.assets ?? [];
  const hasAccess = preview || (data?.hasAccess ?? false);
  const needsSetupPassword = !preview && Boolean(data?.needsSetupPassword);
  const mac = assets.find((asset) => asset.id === "setup-mac");
  const macIntel = assets.find(
    (asset) => asset.id === "setup-mac-intel" && asset.available
  );
  const windows = assets.find((asset) => asset.id === "setup-win");
  const windowsZip = assets.find(
    (asset) => asset.id === "setup-win-zip" && asset.available
  );
  const android = assets.find((asset) => asset.id === "apk");

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
    trackEvent("app_downloaded", { platform, source: "dashboard" });
  }

  async function handleConnect() {
    if (preview) return;
    setConnecting(true);
    setConnectError(null);
    try {
      await openAndroidApp();
    } catch (connectFailure) {
      setConnectError(
        connectFailure instanceof Error
          ? connectFailure.message
          : "Impossible de connecter l'app."
      );
    } finally {
      setConnecting(false);
    }
  }

  return (
    // clip, not hidden: overflow-hidden would stop the header from sticking.
    <div className="relative min-h-screen overflow-x-clip bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-pink-500/10 blur-[120px]" />
        <div className="absolute top-40 right-0 h-[280px] w-[360px] rounded-full bg-violet-500/10 blur-[100px]" />
      </div>

      <DashboardAppHeader
        planLabel={planLabel}
        statusLabel={statusLabel}
        activeTab="home"
      />

      <main className="relative mx-auto max-w-xl px-4 pt-8 pb-8 sm:px-6 sm:pt-12 sm:pb-12">
        {paymentSuccess ? (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-pink-200 bg-pink-50 px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-500 text-white">
              <Check className="h-4 w-4" />
            </span>
            <p className="font-semibold text-zinc-900">
              Paiement confirmé — ton accès est actif.
            </p>
          </div>
        ) : null}

        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Installe Anyloc
          </h1>
          <p className="mt-3 text-sm text-zinc-600 sm:text-base">
            3 étapes, c&apos;est tout.
          </p>
        </div>

        {needsSetupPassword ? (
          <div className="mt-8">
            <SetupPasswordForm preview={preview} />
          </div>
        ) : null}

        <ol className="mt-8 space-y-3">
          <StepCard
            number={1}
            title="Télécharge l'app"
            text="iPhone : prends la version Mac ou Windows (sur ton ordi). Android : prends la version Android (sur ton téléphone)."
          >
            {loading && !preview ? (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Préparation…
              </div>
            ) : error && !preview ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-3">
                <DownloadButton
                  asset={mac}
                  label="Mac"
                  icon={Apple}
                  enabled={hasAccess}
                  onDownload={handleDownload}
                />
                <DownloadButton
                  asset={windows}
                  label="Windows"
                  icon={Monitor}
                  enabled={hasAccess}
                  onDownload={handleDownload}
                />
                <DownloadButton
                  asset={android}
                  label="Android"
                  icon={Smartphone}
                  enabled={hasAccess}
                  onDownload={handleDownload}
                />
              </div>
            )}
          </StepCard>

          <StepCard
            number={2}
            title="Ouvre l'app et connecte-la"
            text="Une fois l'app installée, appuie ici depuis le même appareil : Anyloc s'ouvre déjà connectée à ton compte."
          >
            {device.isAndroid ? (
              <Button
                size="lg"
                variant="secondary"
                className="w-full"
                disabled={connecting || !hasAccess}
                onClick={() => void handleConnect()}
              >
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Connecter Anyloc à mon compte
              </Button>
            ) : (
              // Route handler, pas une page : un <Link> le préchargerait.
              <a href={preview ? "#" : "/desktop/connect"} className="block">
                <Button size="lg" variant="secondary" className="w-full" disabled={!hasAccess}>
                  Connecter Anyloc à mon compte
                </Button>
              </a>
            )}
            {connectError ? (
              <p className="mt-2 text-sm text-red-600">{connectError}</p>
            ) : null}
          </StepCard>

          <StepCard
            number={3}
            title="Choisis ta ville"
            text="Dans l'app, choisis une ville. C'est fait — vérifie dans Snap."
          />
        </ol>

        <Card className="mt-8 border-zinc-200 bg-white px-5 py-2">
          <p className="pt-3 pb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Ça bloque ?
          </p>
          <HelpItem title="Sur Mac, le fichier ne s'ouvre pas">
            <MacOpenHelp />
            {macIntel ? (
              <p className="mt-3 text-xs text-zinc-500">
                Vieux Mac avec processeur Intel ?{" "}
                <a
                  href={macIntel.downloadPath}
                  onClick={() => handleDownload(macIntel.id)}
                  className="font-medium text-pink-600 underline-offset-2 hover:underline"
                >
                  Prends cette version
                </a>
              </p>
            ) : null}
          </HelpItem>
          <HelpItem title="Sur Windows, « Faites attention » s'affiche">
            <WindowsOpenHelp compact embedded zipDownloadPath={windowsZip?.downloadPath} />
          </HelpItem>
          <HelpItem title="Sur Android, l'app ne s'installe pas">
            <AndroidOpenHelp downloaded={false} />
          </HelpItem>
          <HelpItem title="Sur Android, la position ne change pas">
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                <strong>Paramètres → À propos du téléphone</strong> → tape 7 fois sur{" "}
                <strong>Numéro de build</strong>
              </li>
              <li>
                <strong>Options pour les développeurs</strong> → active-les
              </li>
              <li>
                <strong>Application de localisation fictive</strong> → choisis{" "}
                <strong>Anyloc</strong>
              </li>
            </ol>
          </HelpItem>
          {track === "iphone" ? (
            <HelpItem title="J'ai un iPhone mais pas d'ordi">
              <IphoneInstallView embedded />
            </HelpItem>
          ) : null}
        </Card>

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
