"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { track } from "@/lib/analytics/track";
import { describeDevice, MAX_DEVICES_PER_USER, type DeviceItem } from "@/lib/device-list";

type DevicesResult =
  | { ok: true; devices: DeviceItem[] }
  | { ok: false; devices?: DeviceItem[]; error: string };

async function fetchDevices(): Promise<DevicesResult> {
  try {
    const response = await fetch("/api/device");

    if (response.status === 401) {
      return { ok: true, devices: [] };
    }

    if (response.status === 403) {
      return {
        ok: false,
        devices: [],
        error: "Abonnement actif requis pour voir tes appareils.",
      };
    }

    if (!response.ok) {
      throw new Error("Impossible de charger les appareils.");
    }

    const data = await response.json();
    return { ok: true, devices: data.devices ?? [] };
  } catch (loadError) {
    return {
      ok: false,
      error:
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les appareils.",
    };
  }
}

/**
 * "Appareils liés" in Mon compte (settings): every phone, computer or web shortcut linked
 * to the account, with a button to remove one (the limit error points here).
 */
export function DeviceLinkSection() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const apply = useCallback((result: DevicesResult) => {
    if (result.devices) {
      setDevices(result.devices);
    }
    if (!result.ok) {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    void fetchDevices().then((result) => {
      if (active) apply(result);
    });
    return () => {
      active = false;
    };
  }, [apply]);

  const revokeDevice = async (id: string) => {
    setError(null);
    setRemovingId(id);

    try {
      const response = await fetch(`/api/device/${id}`, { method: "DELETE" });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Impossible de supprimer l'appareil.");
      }

      track("device_revoked", { source: "settings" });
      setDevices((current) => current.filter((device) => device.id !== id));
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Impossible de supprimer l'appareil."
      );
    } finally {
      setRemovingId(null);
      setConfirmingId(null);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
          <Smartphone className="h-5 w-5 text-pink-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-zinc-900">
            Appareils liés
            {!loading && (
              <span className="ml-1 text-sm font-normal text-zinc-500">
                ({devices.length}/{MAX_DEVICES_PER_USER})
              </span>
            )}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Supprime un appareil que tu n&apos;utilises plus pour en lier un nouveau.
          </p>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des appareils...
        </div>
      ) : devices.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {devices.map((device) => {
            const { title, detail } = describeDevice(device);
            const confirming = confirmingId === device.id;
            const removing = removingId === device.id;

            return (
              <li
                key={device.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900">{title}</p>
                  <p className="text-xs text-zinc-500">{detail}</p>
                </div>
                {confirming ? (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={removing}
                      onClick={() => setConfirmingId(null)}
                    >
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      disabled={removing}
                      onClick={() => void revokeDevice(device.id)}
                    >
                      {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    aria-label={`Supprimer ${title}`}
                    onClick={() => setConfirmingId(device.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">Aucun appareil lié pour l&apos;instant.</p>
      )}
    </Card>
  );
}
