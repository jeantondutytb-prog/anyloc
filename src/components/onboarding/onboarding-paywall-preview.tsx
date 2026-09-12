"use client";

import { Lock } from "lucide-react";
import { OnboardingAhaMoment } from "@/components/onboarding/onboarding-aha-moment";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";

export function OnboardingPaywallPreview({
  destination,
}: {
  destination: OnboardingDestination;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl">
      <div className="pointer-events-none select-none blur-[6px] brightness-95">
        <OnboardingAhaMoment destination={destination} />
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-white/35 backdrop-blur-[2px]">
        <div className="mx-4 max-w-sm rounded-2xl border border-white/80 bg-white/90 px-5 py-4 text-center shadow-lg">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-pink-100">
            <Lock className="h-5 w-5 text-pink-600" />
          </div>
          <p className="mt-3 text-sm font-semibold text-zinc-900">
            Ta loc à {destination.city} est prête
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Snap, Insta, Tinder — tout est synchronisé. Débloque pour activer.
          </p>
        </div>
      </div>
    </div>
  );
}
