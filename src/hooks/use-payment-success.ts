"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { PAYMENT_SUCCESS_SESSION_KEY } from "@/lib/dashboard-onboarding";

function readStoredPaymentSuccess() {
  try {
    return window.sessionStorage.getItem(PAYMENT_SUCCESS_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

const noSubscribe = () => () => {};

export function usePaymentSuccess() {
  const searchParams = useSearchParams();
  // Read through useSyncExternalStore, not useState's initializer: the server
  // can't see sessionStorage, so reading it on the first render made the
  // "Paiement confirmé" banner differ from the server HTML (React error #418).
  const storedSuccess = useSyncExternalStore(
    noSubscribe,
    readStoredPaymentSuccess,
    () => false
  );
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (!searchParams) {
      return;
    }

    const sessionId = searchParams.get("session_id");
    const urlSuccess = searchParams.get("success") === "true";

    const clearPaymentParams = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.pathname + url.search);
    };

    const markPaymentSuccess = () => {
      try {
        window.sessionStorage.setItem(PAYMENT_SUCCESS_SESSION_KEY, "true");
      } catch {}
      setPaymentSuccess(true);
      clearPaymentParams();
    };

    if (urlSuccess && sessionId) {
      void fetch(`/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`)
        .then(async (response) => {
          if (!response.ok) {
            markPaymentSuccess();
            return;
          }

          const payload = await response.json();
          if (payload.verified || urlSuccess) {
            markPaymentSuccess();
          }
        })
        .catch(() => {
          markPaymentSuccess();
        });
      return;
    }

    if (urlSuccess) {
      markPaymentSuccess();
    }
  }, [searchParams]);

  return paymentSuccess || storedSuccess;
}
