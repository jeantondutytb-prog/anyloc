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

export function useDeviceStatus() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    try {
      const response = await fetch("/api/device");

      if (response.status === 401 || response.status === 403) {
        setDevices([]);
        return;
      }

      if (!response.ok) {
        throw new Error("Impossible de charger les appareils.");
      }

      const data = await response.json();
      setDevices(data.devices ?? []);
      setError(null);
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
