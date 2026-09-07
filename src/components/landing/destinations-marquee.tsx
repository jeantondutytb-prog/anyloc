"use client";

import { DESTINATIONS } from "@/lib/constants";

export function DestinationsMarquee() {
  const items = [...DESTINATIONS, ...DESTINATIONS];

  return (
    <section className="overflow-hidden border-y border-white/5 bg-white/[0.02] py-4">
      <div className="flex animate-marquee gap-8 whitespace-nowrap">
        {items.map((city, i) => (
          <span
            key={`${city}-${i}`}
            className="inline-flex items-center gap-2 text-sm text-zinc-500"
          >
            <span className="text-emerald-400/60">📍</span>
            {city}
          </span>
        ))}
      </div>
    </section>
  );
}
