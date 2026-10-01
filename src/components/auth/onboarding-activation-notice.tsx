"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  ONBOARDING_ACTIVATION_PENDING_KEY,
  ONBOARDING_DESTINATION_KEY,
  type OnboardingDestination,
} from "@/lib/onboarding-destinations";

function subscribeToNothing() {
  return () => {};
}

function readPendingDestination() {
  try {
    if (!window.sessionStorage.getItem(ONBOARDING_ACTIVATION_PENDING_KEY)) {
      return null;
    }
    return window.sessionStorage.getItem(ONBOARDING_DESTINATION_KEY);
  } catch {
    return null;
  }
}

/**
 * Reminds visitors coming from the onboarding sandbox which position they
 * picked, so signup reads as the step that activates it.
 */
export function OnboardingActivationNotice({ action }: { action: "signup" | "login" }) {
  const raw = useSyncExternalStore(subscribeToNothing, readPendingDestination, () => null);
  const destination = useMemo(() => {
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as OnboardingDestination;
    } catch {
      return null;
    }
  }, [raw]);

  if (!destination) {
    return null;
  }

  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-pink-100 bg-gradient-to-r from-pink-50 to-violet-50 px-4 py-3.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
        {destination.emoji}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-pink-600">
          Ta position est prête
        </p>
        <p className="truncate font-semibold text-zinc-900">{destination.city}</p>
        <p className="text-sm text-zinc-600">
          {action === "signup"
            ? "Crée ton compte pour l'activer."
            : "Connecte-toi pour l'activer."}
        </p>
      </div>
    </div>
  );
}
