"use client";

import { useCallback, useEffect, useState } from "react";

export type DeviceItem = {
  id: string;
  platform: "android" | "ios";
  deviceName: string;
  lastSeenAt: string | null;
  createdAt: string;
};

const ONLINE_THRESHOLD_MS = 45_000;
const POLL_INTERVAL_MS = 10_000;

function isDeviceOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) {
    return false;
  }

  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

type DevicesResult =
  | { ok: true; devices: DeviceItem[] }
  | { ok: false; error: string };

async function fetchDevices(): Promise<DevicesResult> {
  try {
    const response = await fetch("/api/device");

    if (response.status === 401 || response.status === 403) {
      return { ok: true, devices: [] };
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

export function useDeviceStatus() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((result: DevicesResult) => {
    if (result.ok) {
      setDevices(result.devices);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  const loadDevices = useCallback(async () => {
    apply(await fetchDevices());
  }, [apply]);

  useEffect(() => {
    let active = true;
    void fetchDevices().then((result) => {
      if (active) apply(result);
    });
    return () => {
      active = false;
    };
  }, [apply]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadDevices();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [loadDevices]);

  const linkedDevice = devices[0] ?? null;
  const phoneOnline = devices.some((device) => isDeviceOnline(device.lastSeenAt));
  const hasLinkedDevice = devices.length > 0;

  return {
    devices,
    linkedDevice,
    phoneOnline,
    hasLinkedDevice,
    loading,
    error,
    reload: loadDevices,
  };
}
