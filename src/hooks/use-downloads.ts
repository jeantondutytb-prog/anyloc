"use client";

import { useEffect, useState } from "react";

export type DownloadAssetInfo = {
  id: string;
  label: string;
  description: string;
  filename: string;
  available: boolean;
  downloadPath: string;
};

export type DownloadsResponse = {
  hasAccess: boolean;
  isAdmin?: boolean;
  subscriptionStatus: string | null;
  assets: DownloadAssetInfo[];
};

export function useDownloads() {
  const [data, setData] = useState<DownloadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDownloads() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/downloads");

        if (response.status === 401) {
          setData(null);
          return;
        }

        if (!response.ok) {
          throw new Error("Impossible de charger les téléchargements.");
        }

        setData(await response.json());
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger les téléchargements."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadDownloads();
  }, []);

  return { data, loading, error };
}
