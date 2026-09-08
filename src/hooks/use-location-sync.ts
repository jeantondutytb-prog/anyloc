"use client";

import { useCallback, useEffect, useState } from "react";

export type SyncedLocation = {
  name: string;
  lat: number;
  lng: number;
  accuracy: number;
  isActive: boolean;
  updatedAt: string | null;
};

type UseLocationSyncOptions = {
  onSynced?: () => void;
};

export function useLocationSync({ onSynced }: UseLocationSyncOptions = {}) {
  const [location, setLocation] = useState<SyncedLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/location");

      if (response.status === 401) {
        setLocation(null);
        return;
      }

      if (!response.ok) {
        throw new Error("Impossible de charger ta position.");
      }

      const data = await response.json();
      setLocation(data.location);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger ta position."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLocation();
  }, [loadLocation]);

  const saveLocation = useCallback(
    async (next: {
      name: string;
      lat: number;
      lng: number;
      accuracy?: number;
      isActive?: boolean;
    }) => {
      setSaving(true);
      setError(null);

      try {
        const response = await fetch("/api/location", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(next),
        });

        if (response.status === 401) {
          throw new Error("Connecte-toi pour synchroniser ta position.");
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Impossible d'enregistrer ta position.");
        }

        setLocation(data.location);
        onSynced?.();
        return data.location as SyncedLocation;
      } catch (saveError) {
        const message =
          saveError instanceof Error
            ? saveError.message
            : "Impossible d'enregistrer ta position.";
        setError(message);
        throw saveError;
      } finally {
        setSaving(false);
      }
    },
    [onSynced]
  );

  return {
    location,
    loading,
    saving,
    error,
    reload: loadLocation,
    saveLocation,
  };
}
