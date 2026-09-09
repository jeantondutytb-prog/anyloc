"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Loader2,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DeviceItem } from "@/hooks/use-device-status";

type Platform = "ios" | "android";

type CreatedToken = {
  token: string;
  platform: Platform;
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

      setCreatedToken({ token: data.token, platform });
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
            Choisis une ville ou clique sur la carte — ta loc iPhone se met à jour
            toute seule.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Étape 1 · Branche ton téléphone
        </p>
        <p className="mt-1 text-sm text-zinc-600">
          Génère un code, installe l&apos;app Anyloc sur ton tel et colle le code.
          Ensuite, tout se pilote depuis cette carte.
        </p>
      </div>

      <div className="flex gap-2">
        {(["ios", "android"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setPlatform(value);
              setCreatedToken(null);
              setError(null);
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

      {linkedForPlatform && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">App déjà liée — ouvre-la sur ton téléphone</p>
          <p className="mt-1 text-xs text-amber-800/90">
            {linkedForPlatform.deviceName} est configuré. Lance Anyloc sur ton tel
            {platform === "ios" ? " (LocalDevVPN connecté)" : ""} pour recevoir ta
            position depuis le dashboard.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {createdToken ? (
        <div className="rounded-xl border border-pink-200 bg-pink-50/70 p-4">
          <p className="text-sm font-medium text-pink-700">
            Copie ce code dans l&apos;app Anyloc
          </p>
          <code className="mt-3 block break-all rounded-lg bg-white px-3 py-2 text-xs text-zinc-800">
            {createdToken.token}
          </code>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button size="sm" onClick={() => void copyToken()}>
              <Copy className="h-4 w-4" />
              {copied ? "Copié" : "Copier le code"}
            </Button>
            <Link href={`/dashboard/installation?platform=${platform}`}>
              <Button size="sm" variant="secondary" className="w-full">
                Guide d&apos;installation
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1"
            disabled={creating}
            onClick={() => void createToken()}
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Smartphone className="h-4 w-4" />
            )}
            Générer mon code
          </Button>
          <Link href={`/dashboard/installation?platform=${platform}`} className="flex-1">
            <Button variant="secondary" className="w-full">
              Guide complet
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
