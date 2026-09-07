"use client";

import { useEffect, useState } from "react";

const PARTICLES = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  left: `${8 + ((index * 17) % 84)}%`,
  top: `${6 + ((index * 23) % 88)}%`,
  delay: `${(index % 6) * 0.7}s`,
  duration: `${4 + (index % 5)}s`,
}));

export function AuthMarketingPanel() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative hidden w-1/2 overflow-hidden bg-zinc-950 p-12 lg:flex lg:items-center lg:justify-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgba(244,114,182,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_70%,rgba(168,85,247,0.12),transparent_50%)]" />

      {mounted
        ? PARTICLES.map((particle) => (
            <span
              key={particle.id}
              className="auth-particle absolute h-1 w-1 rounded-full bg-pink-400/80"
              style={{
                left: particle.left,
                top: particle.top,
                animationDelay: particle.delay,
                animationDuration: particle.duration,
              }}
            />
          ))
        : null}

      <div className="relative z-10 max-w-md text-white">
        <div className="mb-10 inline-block text-2xl font-extrabold tracking-tight">
          Anyloc
        </div>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-300">
          GPS modifié · toutes tes apps
        </div>

        <h2 className="text-4xl font-extrabold leading-tight tracking-tight">
          Ta map t&apos;attend.
          <br />
          Mets-toi à{" "}
          <span className="rounded-md bg-gradient-to-r from-pink-400 to-violet-400 px-1.5 text-zinc-950 box-decoration-clone">
            Marbella
          </span>{" "}
          ce soir.
        </h2>

        <p className="mt-4 text-lg text-neutral-400">
          Un compte, une position, toutes tes apps. Snap, Insta, rencontres —
          un seul réglage pour tout l&apos;appareil.
        </p>
      </div>
    </div>
  );
}
