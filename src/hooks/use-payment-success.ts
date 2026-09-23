"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PAYMENT_SUCCESS_SESSION_KEY } from "@/lib/dashboard-onboarding";

function readStoredPaymentSuccess() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(PAYMENT_SUCCESS_SESSION_KEY) === "true";
}

export function usePaymentSuccess() {
  const searchParams = useSearchParams();
  const [paymentSuccess, setPaymentSuccess] = useState(readStoredPaymentSuccess);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const urlSuccess = searchParams.get("success") === "true";

    const clearPaymentParams = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.pathname + url.search);
    };

    const markPaymentSuccess = () => {
      window.sessionStorage.setItem(PAYMENT_SUCCESS_SESSION_KEY, "true");
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

  return paymentSuccess;
}
