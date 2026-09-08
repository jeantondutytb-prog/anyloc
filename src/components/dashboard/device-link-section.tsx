"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type DeviceItem = {
  id: string;
  platform: "android" | "ios";
  deviceName: string;
  lastSeenAt: string | null;
  createdAt: string;
};

type CreatedToken = {
  token: string;
  platform: "android" | "ios";
  apiBaseUrl: string;
};

export function DeviceLinkSection() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<"android" | "ios" | null>(null);
  const [createdToken, setCreatedToken] = useState<CreatedToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/device");

      if (response.status === 401) {
        setDevices([]);
        return;
      }

      if (response.status === 403) {
        setDevices([]);
        setError("Abonnement actif requis pour lier un appareil.");
        return;
      }

      if (!response.ok) {
        throw new Error("Impossible de charger les appareils.");
      }

      const data = await response.json();
      setDevices(data.devices ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les appareils."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const createToken = async (platform: "android" | "ios") => {
    setCreating(platform);
    setError(null);
    setCreatedToken(null);

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
        throw new Error(data.error ?? "Impossible de créer le token.");
      }

      setCreatedToken({
        token: data.token,
        platform,
        apiBaseUrl: data.apiBaseUrl,
      });
      await loadDevices();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Impossible de créer le token."
      );
    } finally {
      setCreating(null);
    }
  };

  const revokeDevice = async (id: string) => {
    setError(null);

    try {
      const response = await fetch(`/api/device/${id}`, { method: "DELETE" });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Impossible de supprimer l'appareil.");
      }

      await loadDevices();
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Impossible de supprimer l'appareil."
      );
    }
  };

  const copyToken = async () => {
    if (!createdToken) {
      return;
    }

    await navigator.clipboard.writeText(createdToken.token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-5">
      <h3 className="text-sm font-medium text-zinc-600">Lier ton appareil</h3>
      <p className="mt-2 text-sm text-zinc-500">
        Génère un token pour connecter l&apos;app Android ou iOS à ton compte.
        L&apos;app lit ensuite ta position via{" "}
        <code className="text-xs">GET /api/device/location</code>.
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          size="sm"
          variant="secondary"
          disabled={creating !== null}
          onClick={() => void createToken("android")}
        >
          {creating === "android" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Smartphone className="h-4 w-4" />
          )}
          Token Android
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={creating !== null}
          onClick={() => void createToken("ios")}
        >
          {creating === "ios" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Smartphone className="h-4 w-4" />
          )}
          Token iPhone
        </Button>
      </div>

      {createdToken && (
        <div className="mt-4 rounded-xl border border-pink-200 bg-pink-50/70 p-4">
          <p className="text-sm font-medium text-pink-700">
            Token créé — copie-le maintenant
          </p>
          <p className="mt-1 text-xs text-pink-600/90">
            Il ne sera plus affiché après fermeture de cette page.
          </p>
          <code className="mt-3 block break-all rounded-lg bg-white px-3 py-2 text-xs text-zinc-800">
            {createdToken.token}
          </code>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => void copyToken()}>
              <Copy className="h-4 w-4" />
              {copied ? "Copié" : "Copier"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCreatedToken(null)}
            >
              Fermer
            </Button>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            API : {createdToken.apiBaseUrl}/api/device/location
          </p>
        </div>
      )}

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des appareils...
        </div>
      ) : devices.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {devices.map((device) => (
            <li
              key={device.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-zinc-900">{device.deviceName}</p>
                <p className="text-xs text-zinc-500">
                  {device.platform === "android" ? "Android" : "iPhone"}
                  {device.lastSeenAt
                    ? ` · vu ${new Date(device.lastSeenAt).toLocaleString("fr-FR")}`
                    : " · jamais connecté"}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void revokeDevice(device.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">Aucun appareil lié pour l&apos;instant.</p>
      )}
    </Card>
  );
}
