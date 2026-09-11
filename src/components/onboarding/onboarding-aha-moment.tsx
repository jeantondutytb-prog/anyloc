"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Smartphone } from "lucide-react";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";
import { cn } from "@/lib/utils";

const APPS = [
  { label: "SNAP MAP", pinClass: "text-yellow-500" },
  { label: "INSTAGRAM", pinClass: "text-pink-500" },
  { label: "TINDER", pinClass: "text-rose-500" },
  { label: "LIFE360", pinClass: "text-emerald-500" },
];

export function OnboardingAhaMoment({
  destination,
}: {
  destination: OnboardingDestination;
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setRevealed(true), 600);
    return () => clearTimeout(timer);
  }, [destination.id]);

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl">
      <div className="bg-gradient-to-r from-pink-500 to-violet-500 px-5 py-3 text-center text-sm font-medium text-white">
        <span className="inline-flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          Signal GPS actif
        </span>
      </div>

      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3"
        >
          <span className="text-3xl">{destination.emoji}</span>
          <div>
            <p className="font-semibold text-zinc-900">{destination.city}</p>
            <p className="text-sm text-zinc-500">{destination.area}</p>
          </div>
        </motion.div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {APPS.map((app, index) => (
            <motion.div
              key={app.label}
              initial={{ opacity: 0.35, scale: 0.97 }}
              animate={{
                opacity: revealed ? 1 : 0.35,
                scale: revealed ? 1 : 0.97,
              }}
              transition={{
                delay: revealed ? index * 0.12 : 0,
                duration: 0.35,
                ease: "easeOut",
              }}
              className={cn(
                "rounded-xl border px-3 py-3 transition-colors",
                revealed
                  ? "border-zinc-100 bg-zinc-50"
                  : "border-zinc-100 bg-white"
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                {app.label}
              </p>
              <p className="mt-1 flex items-center gap-1 text-sm font-medium text-zinc-800">
                <MapPin className={cn("h-3.5 w-3.5", app.pinClass)} />
                {revealed ? destination.city : "—"}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: revealed ? 1 : 0 }}
          transition={{ delay: 0.55, duration: 0.35 }}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Coordonnées GPS mises à jour en temps réel
        </motion.div>
      </div>
    </div>
  );
}
