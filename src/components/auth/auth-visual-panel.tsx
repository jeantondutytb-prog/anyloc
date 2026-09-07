"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Navigation, Smartphone, Sparkles } from "lucide-react";
import { AuthGlobe } from "@/components/auth/auth-globe";
import { SITE } from "@/lib/constants";

const features = [
  { icon: Smartphone, text: "Une position pour tout l'appareil" },
  { icon: Navigation, text: "Snap, Insta, apps de rencontre" },
  { icon: Sparkles, text: "3 jours d'essai gratuit" },
];

export function AuthVisualPanel({ mode }: { mode: "login" | "signup" }) {
  return (
    <div className="dark-panel relative hidden min-h-screen w-[44%] overflow-hidden bg-zinc-950 lg:flex lg:flex-col">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-500/10 blur-3xl"
        />
      </div>

      <div className="relative z-10 flex h-full flex-col p-8 xl:p-10">
        <Link href="/" className="inline-flex w-fit items-center gap-2 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
            <MapPin className="h-4 w-4 text-pink-300" />
          </div>
          <span className="text-lg font-semibold tracking-tight">{SITE.name}</span>
        </Link>

        <div className="flex flex-1 flex-col items-center justify-center gap-6 py-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex w-full items-center justify-center"
          >
            <AuthGlobe />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="max-w-sm"
          >
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-300">
              {mode === "login" ? "Espace membre" : "Essai gratuit · 3 jours"}
            </p>

            <h2 className="text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
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

            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              {mode === "login"
                ? "Retrouve ton dashboard et ta position active."
                : "Teste Anyloc gratuitement sur toutes tes apps."}
            </p>
          </motion.div>

          <motion.ul
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1, delayChildren: 0.45 } },
            }}
            className="space-y-2.5 text-left"
          >
            {features.map((feature) => (
              <motion.li
                key={feature.text}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0 },
                }}
                className="flex items-center gap-3 text-sm text-zinc-300"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
                  <feature.icon className="h-3.5 w-3.5 text-pink-300" />
                </span>
                {feature.text}
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <p className="text-center text-sm text-zinc-500">{SITE.tagline}</p>
      </div>
    </div>
  );
}
