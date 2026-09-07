"use client";

import { DESTINATIONS } from "@/lib/constants";

export function DestinationsMarquee() {
  const items = [...DESTINATIONS, ...DESTINATIONS];

  return (
    <section className="overflow-hidden border-y border-pink-500/10 bg-gradient-to-r from-pink-500/5 via-violet-500/5 to-orange-500/5 py-4">
      <div className="flex animate-marquee gap-8 whitespace-nowrap">
        {items.map((city, i) => (
          <span
            key={`${city}-${i}`}
            className="inline-flex items-center gap-2 text-sm text-zinc-500"
          >
            <span className="text-pink-600/80">📍</span>
            {city}
          </span>
        ))}
      </div>
    </section>
  );
}
