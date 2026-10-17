"use client";

import { MapPin } from "lucide-react";
import { DESTINATIONS } from "@/lib/constants";

export function DestinationsMarquee() {
  const items = [...DESTINATIONS, ...DESTINATIONS];

  return (
    <section data-track-section="destinations_marquee" className="overflow-hidden py-4">
      <div className="flex animate-marquee gap-8 whitespace-nowrap">
        {items.map((city, i) => (
          <span
            key={`${city}-${i}`}
            className="inline-flex items-center gap-2 text-sm text-zinc-500"
          >
            <MapPin className="h-3.5 w-3.5 text-pink-600" />
            {city}
          </span>
        ))}
      </div>
    </section>
  );
}
