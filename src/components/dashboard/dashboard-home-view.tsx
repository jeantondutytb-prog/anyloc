"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { SettingsView } from "@/components/dashboard/settings-view";
import { PAYMENT_SUCCESS_SESSION_KEY } from "@/lib/dashboard-onboarding";

function DashboardHomeContent({ preview = false }: { preview?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountTab = searchParams.get("tab") === "account";
  const forceSetup = searchParams.get("setup") === "1";
  const [paymentSuccess, setPaymentSuccess] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.sessionStorage.getItem(PAYMENT_SUCCESS_SESSION_KEY) === "true";
  });

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
            if (urlSuccess) {
              markPaymentSuccess();
            }
            return;
          }

          const payload = await response.json();
          if (payload.verified || urlSuccess) {
            markPaymentSuccess();
          }
        })
        .catch(() => {
          if (urlSuccess) {
            markPaymentSuccess();
          }
        });
      return;
    }

    if (urlSuccess) {
      markPaymentSuccess();
    }
  }, [searchParams]);

  if (accountTab && !forceSetup) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardPageHeader />
        <main className="p-4 pb-8 sm:p-6 lg:p-8">
          <SettingsView embedded />
        </main>
      </div>
    );
  }

  return (
    <DashboardView
      preview={preview}
      paymentSuccess={paymentSuccess}
      forceSetup={forceSetup}
      onSetupComplete={() => {
        if (forceSetup) {
          router.replace("/dashboard");
        }
      }}
    />
  );
}

export function DashboardHomeView({ preview = false }: { preview?: boolean } = {}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-sm text-zinc-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Chargement de ton espace...
        </div>
      }
    >
      <DashboardHomeContent preview={preview} />
    </Suspense>
  );
}
