"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Navigation, Smartphone, Sparkles } from "lucide-react";
import { AuthPointsBackground } from "@/components/auth/auth-points-background";
import { SITE } from "@/lib/constants";

const features = [
  { icon: Smartphone, text: "Une position pour tout l'appareil" },
  { icon: Navigation, text: "Snap, Insta, apps de rencontre" },
  { icon: Sparkles, text: "3 jours d'essai gratuit" },
];

export function AuthVisualPanel({ mode }: { mode: "login" | "signup" }) {
  return (
    <div className="relative hidden min-h-screen w-[44%] overflow-hidden border-r border-pink-100/80 bg-background lg:flex lg:flex-col">
      <AuthPointsBackground />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-pink-500/10 blur-[120px]" />
        <div className="absolute top-0 right-0 h-[280px] w-[360px] rounded-full bg-violet-500/10 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[220px] w-[320px] rounded-full bg-orange-500/8 blur-[100px]" />
      </div>

      <div className="relative z-10 flex h-full flex-col p-8 xl:p-10">
        <Link href="/" className="inline-flex w-fit items-center gap-2 text-zinc-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/30 to-violet-500/30">
            <MapPin className="h-4 w-4 text-pink-600" />
          </div>
          <span className="text-lg font-semibold tracking-tight">{SITE.name}</span>
        </Link>

        <div className="flex flex-1 flex-col items-center justify-center gap-8 py-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-sm"
          >
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-pink-200/60 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-wider text-zinc-600 backdrop-blur-sm">
              {mode === "login" ? "Espace membre" : "Essai gratuit · 3 jours"}
            </p>

            <h2 className="text-3xl font-bold leading-tight tracking-tight text-zinc-900 xl:text-4xl">
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

            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              {mode === "login"
                ? "Retrouve ton dashboard et ta position active."
                : "Teste Anyloc gratuitement sur toutes tes apps."}
            </p>
          </motion.div>

          <motion.ul
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
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
                className="flex items-center gap-3 text-sm text-zinc-600"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-pink-100 bg-white/80 shadow-sm">
                  <feature.icon className="h-3.5 w-3.5 text-pink-600" />
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
