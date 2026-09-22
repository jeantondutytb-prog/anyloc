"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { SettingsView } from "@/components/dashboard/settings-view";
import { usePaymentSuccess } from "@/hooks/use-payment-success";

function DashboardHomeContent({ preview = false }: { preview?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountTab = searchParams.get("tab") === "account";
  const forceSetup = searchParams.get("setup") === "1";
  const paymentSuccess = usePaymentSuccess();

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
