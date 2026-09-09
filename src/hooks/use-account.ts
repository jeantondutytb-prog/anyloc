"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountBillingDetails } from "@/lib/account-billing-types";

export function useAccount() {
  const [data, setData] = useState<AccountBillingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/account");

      if (response.status === 401) {
        setData(null);
        return;
      }

      if (!response.ok) {
        throw new Error("Impossible de charger les informations du compte.");
      }

      setData(await response.json());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les informations du compte."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}
