"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountBillingDetails } from "@/lib/account-billing-types";

type AccountResult =
  | { ok: true; data: AccountBillingDetails | null }
  | { ok: false; error: string };

async function fetchAccount(): Promise<AccountResult> {
  try {
    const response = await fetch("/api/account");

    if (response.status === 401) {
      return { ok: true, data: null };
    }

    if (!response.ok) {
      throw new Error("Impossible de charger les informations du compte.");
    }

    return { ok: true, data: await response.json() };
  } catch (loadError) {
    return {
      ok: false,
      error:
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les informations du compte.",
    };
  }
}

export function useAccount() {
  const [data, setData] = useState<AccountBillingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((result: AccountResult) => {
    if (result.ok) {
      setData(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    apply(await fetchAccount());
  }, [apply]);

  useEffect(() => {
    let active = true;
    void fetchAccount().then((result) => {
      if (active) apply(result);
    });
    return () => {
      active = false;
    };
  }, [apply]);

  return { data, loading, error, reload };
}
