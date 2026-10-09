"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import appTeleport from "../../../public/landing/app-teleport.webp";
import { cn } from "@/lib/utils";

/** Percentages of the screenshot (924 × 2000), on the edge of each control so the dot doesn't hide it. */
const hotspots = [
  {
    x: 9,
    y: 17.5,
    title: "Cherche une ville",
    body: "Une ville, une adresse ou un lieu précis.",
  },
  {
    x: 59,
    y: 31.5,
    title: "Ou touche la carte",
    body: "Le pin se pose exactement où tu veux.",
  },
  {
    x: 91,
    y: 67.8,
    title: "Explorer",
    body: "Des spots déjà prêts : Marbella, Dubaï, Mykonos…",
  },
  {
    x: 65,
    y: 73.3,
    title: "Tes favoris",
    body: "Garde tes spots et reviens-y en un tap.",
  },
  {
    x: 91,
    y: 86.6,
    title: "Définir cette position",
    body: "Snap, Insta, Tinder et tous tes jeux voient cette ville.",
  },
];

const CYCLE_MS = 3200;

export function AppShowcase() {
  const [active, setActive] = useState(0);
  // Cycles on its own so phones (no hover) still get the tour, until someone
  // picks a spot themselves.
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (touched || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const timer = window.setInterval(
      () => setActive((i) => (i + 1) % hotspots.length),
      CYCLE_MS
    );
    return () => window.clearInterval(timer);
  }, [touched]);

  const pick = (i: number) => {
    setTouched(true);
    setActive(i);
  };

  const current = hotspots[active];

  return (
    <section id="app" data-track-section="app_showcase" className="py-20 sm:py-28">
      <div className="mx-auto grid max-w-5xl items-center gap-12 px-4 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-16">
        <div className="mx-auto w-full max-w-[290px] md:order-2 md:max-w-[330px]">
          <div className="rounded-[2.75rem] bg-zinc-900 p-2.5 shadow-2xl shadow-zinc-900/25 ring-1 ring-zinc-700">
            <div className="relative">
              <Image
                src={appTeleport}
                alt="L'app Anyloc sur iPhone : un pin posé sur New York, prêt à être défini comme position."
                sizes="(min-width: 768px) 330px, 290px"
                className="h-auto w-full rounded-[2.25rem]"
                placeholder="blur"
              />

              {hotspots.map((spot, i) => (
                <button
                  key={spot.title}
                  type="button"
                  aria-label={`${i + 1}. ${spot.title}`}
                  aria-pressed={active === i}
                  onClick={() => pick(i)}
                  onMouseEnter={() => pick(i)}
                  onFocus={() => pick(i)}
                  style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                  className={cn(
                    "absolute isolate flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-bold ring-2 transition-transform focus-visible:outline-none focus-visible:ring-4",
                    active === i
                      ? "scale-110 bg-white text-pink-600 ring-pink-500"
                      : "bg-pink-600 text-white ring-white/80"
                  )}
                >
                  {i + 1}
                  {active === i && (
                    <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-pink-400/60 motion-reduce:hidden" />
                  )}
                </button>
              ))}

              {/* Above the spot when it sits low on the screen, below otherwise. */}
              <div
                key={active}
                role="status"
                style={
                  current.y > 50
                    ? { bottom: `${100 - current.y + 3.5}%` }
                    : { top: `${current.y + 3.5}%` }
                }
                className="pointer-events-none absolute inset-x-3 rounded-xl bg-white/95 px-3 py-2 text-center shadow-lg shadow-black/30 backdrop-blur"
              >
                <p className="text-[13px] font-semibold text-zinc-900">{current.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-zinc-600">{current.body}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="md:order-1">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Choisis ta ville, toutes tes apps suivent.
          </h2>
          <p className="mt-4 text-zinc-600">
            Un VPN change ton IP, pas ton GPS. Anyloc change directement le GPS
            du téléphone.
          </p>

          <ol className="mt-8 space-y-1">
            {hotspots.map((spot, i) => (
              <li key={spot.title}>
                <button
                  type="button"
                  onClick={() => pick(i)}
                  onMouseEnter={() => pick(i)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    active === i ? "bg-pink-50" : "hover:bg-zinc-50"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      active === i ? "bg-pink-600 text-white" : "bg-zinc-100 text-zinc-500"
                    )}
                  >
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-semibold text-zinc-900">{spot.title}</span>
                    <span className="block text-sm text-zinc-600">{spot.body}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <p className="mt-6 px-3 text-sm text-zinc-600">
            Et en mode Trajet, ta loc se déplace toute seule le long d&apos;un
            parcours, à pied ou en voiture.
          </p>
        </div>
      </div>
    </section>
  );
}
