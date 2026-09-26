"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Monitor } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Legacy wizard — onboarding now lives in Anyloc Setup (desktop) or in-app (Android).
 * This component redirects to the dashboard in production and shows a dev preview stub.
 */
export function InstallationGuideView({
  preview = false,
}: { preview?: boolean } = {}) {
  const router = useRouter();

  useEffect(() => {
    if (!preview) {
      router.replace("/dashboard");
    }
  }, [preview, router]);

  if (!preview) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Redirection…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="max-w-md p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
          <Monitor className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-zinc-900">
          Le tutoriel est dans Anyloc Setup
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Le wizard web a été retiré. Télécharge Anyloc Setup sur le dashboard —
          USB, install iPhone et première ville se font dans l&apos;app desktop.
        </p>
        <Link href="/preview/dashboard?success=true" className="mt-6 block">
          <Button className="w-full">Voir le dashboard</Button>
        </Link>
      </Card>
    </div>
  );
}
