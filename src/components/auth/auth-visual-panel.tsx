"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Smartphone, Sparkles } from "lucide-react";
import { DESTINATIONS, SITE } from "@/lib/constants";

const features = [
  { icon: Smartphone, text: "Une position pour tout l'appareil" },
  { icon: Navigation, text: "Snap, Insta, apps de rencontre" },
  { icon: Sparkles, text: "3 jours d'essai gratuit" },
];

const floatingCards = [
  { label: "Snapchat", x: "12%", y: "18%", delay: 0 },
  { label: "Instagram", x: "68%", y: "24%", delay: 0.4 },
  { label: "Tinder", x: "22%", y: "62%", delay: 0.8 },
  { label: "Find My", x: "72%", y: "58%", delay: 1.2 },
];

export function AuthVisualPanel({ mode }: { mode: "login" | "signup" }) {
  const [destinationIndex, setDestinationIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDestinationIndex((current) => (current + 1) % DESTINATIONS.length);
    }, 2800);

    return () => window.clearInterval(interval);
  }, []);

  const destination = DESTINATIONS[destinationIndex];

  return (
    <div className="dark-panel relative hidden min-h-screen w-[44%] overflow-hidden bg-zinc-950 lg:flex lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.5, 0.35] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-pink-500/25 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-1/3 right-0 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-orange-500/15 blur-3xl"
        />
      </div>

      <div className="relative z-10 flex h-full flex-col p-10 xl:p-14">
        <Link href="/" className="inline-flex w-fit items-center gap-2 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
            <MapPin className="h-4 w-4 text-pink-300" />
          </div>
          <span className="text-lg font-semibold tracking-tight">{SITE.name}</span>
        </Link>

        <div className="relative my-auto flex flex-1 flex-col justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-300">
              {mode === "login" ? "Espace membre" : "Essai gratuit · 3 jours"}
            </p>

            <h2 className="max-w-md text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
              {mode === "login" ? (
                <>
                  Content de te{" "}
                  <span className="gradient-text">revoir</span>.
                </>
              ) : (
                <>
                  Choisis où tu es.{" "}
                  <span className="gradient-text">Pas où tu dors.</span>
                </>
              )}
            </h2>

            <p className="mt-5 max-w-md text-base leading-relaxed text-zinc-400">
              {mode === "login"
                ? "Retrouve ton dashboard, tes lieux favoris et ta position active en quelques secondes."
                : "Crée ton compte et teste Anyloc gratuitement — une seule position pour toutes tes apps."}
            </p>
          </motion.div>

          <div className="relative mt-12 h-56 w-full max-w-lg">
            <div className="absolute inset-0 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px]" />

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <div className="relative">
                  <span className="absolute -inset-4 rounded-full bg-pink-500/20 blur-xl" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 shadow-lg shadow-pink-500/30">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                </div>
              </motion.div>

              {floatingCards.map((card) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: [0, -6, 0],
                  }}
                  transition={{
                    opacity: { delay: card.delay + 0.3, duration: 0.5 },
                    scale: { delay: card.delay + 0.3, duration: 0.5 },
                    y: {
                      delay: card.delay + 0.8,
                      duration: 3.5 + card.delay,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }}
                  style={{ left: card.x, top: card.y }}
                  className="absolute rounded-full border border-white/10 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-200 backdrop-blur-sm"
                >
                  {card.label}
                </motion.div>
              ))}
            </div>

            <div className="absolute -bottom-3 left-6 right-6 rounded-2xl border border-white/10 bg-zinc-900/90 px-4 py-3 backdrop-blur-md">
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Position active
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-pink-500" />
                </span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={destination}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                    className="text-sm font-semibold text-white"
                  >
                    {destination}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </div>

          <motion.ul
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.12, delayChildren: 0.4 } },
            }}
            className="mt-10 space-y-3"
          >
            {features.map((feature) => (
              <motion.li
                key={feature.text}
                variants={{
                  hidden: { opacity: 0, x: -12 },
                  visible: { opacity: 1, x: 0 },
                }}
                className="flex items-center gap-3 text-sm text-zinc-300"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                  <feature.icon className="h-4 w-4 text-pink-300" />
                </span>
                {feature.text}
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <p className="relative z-10 text-sm text-zinc-500">{SITE.tagline}</p>
      </div>
    </div>
  );
}
