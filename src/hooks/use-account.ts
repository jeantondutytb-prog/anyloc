"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountBillingDetails } from "@/lib/account-billing-types";
import { PREVIEW_ACCOUNT } from "@/lib/preview-account";

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

/** `preview`: the dev-only dashboard preview, served a fake account, no fetch. */
export function useAccount(preview = false) {
  const [data, setData] = useState<AccountBillingDetails | null>(preview ? PREVIEW_ACCOUNT : null);
  const [loading, setLoading] = useState(!preview);
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
    if (preview) return;
    let active = true;
    void fetchAccount().then((result) => {
      if (active) apply(result);
    });
    return () => {
      active = false;
    };
  }, [apply, preview]);

  return { data, loading, error, reload };
}
