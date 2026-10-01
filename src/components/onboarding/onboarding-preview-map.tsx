"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";

const LocationMap = dynamic(() => import("@/components/dashboard/location-map"), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-[16/10] items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50">
      <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
    </div>
  ),
});

export function OnboardingPreviewMap({
  destination,
  onDestinationChange,
}: {
  destination: OnboardingDestination;
  onDestinationChange: (lat: number, lng: number) => void;
}) {
  const location = {
    name: `${destination.city} — ${destination.area}`,
    lat: destination.lat,
    lng: destination.lng,
  };

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 [&_.simple-map-shell]:h-[220px] [&_.simple-map-shell]:lg:h-[220px]">
      <LocationMap
        selected={location}
        onSelect={(loc) => onDestinationChange(loc.lat, loc.lng)}
        active={true}
        layoutKey={destination.id.charCodeAt(0)}
      />
      <p className="border-t border-zinc-100 bg-zinc-50 px-3 py-2 text-center text-[11px] text-zinc-500">
        Déplace le pin pour affiner ta position
      </p>
    </div>
  );
}
