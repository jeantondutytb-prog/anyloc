"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SITE } from "@/lib/constants";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-pink-500/10 blur-[120px]" />
        <div className="absolute top-0 right-0 h-[300px] w-[400px] rounded-full bg-violet-500/10 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[250px] w-[350px] rounded-full bg-orange-500/8 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <Badge className="mb-6">GPS spoofé · toutes tes apps</Badge>

          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl sm:leading-[1.1]">
            Fake ta loc à{" "}
            <span className="gradient-text">
              Marbella
            </span>
            <br />
            alors que t&apos;es posé chez toi.
          </h1>

          <p className="mt-6 text-lg text-zinc-600 sm:text-xl">
            {SITE.name} hack ton GPS — Snap, Insta, Tinder, jeux : un réglage
            et tout ton tel déménage.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Fake ma loc
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/#how-it-works">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                <Play className="h-4 w-4" />
                Voir comment ça marche
              </Button>
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-pink-600" />
              GPS natif
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-pink-600" />
              iOS + Android
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-pink-600" />
              Multi-apps
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-pink-600" />
              Zéro jailbreak
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative mx-auto mt-16 max-w-4xl"
        >
          <div className="overflow-hidden rounded-2xl border border-pink-500/15 bg-gradient-to-b from-pink-500/10 via-violet-500/5 to-transparent p-1 shadow-2xl shadow-pink-500/10">
            <div className="rounded-xl bg-white p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-pink-500 animate-pulse" />
                  <span className="text-sm text-zinc-600">
                    Signal GPS actif
                  </span>
                </div>
                <span className="text-sm font-medium text-pink-600">
                  📍 Marbella — Puerto Banús
                </span>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs text-zinc-500">Ce que tes potes voient</p>
                  <p className="mt-1 font-medium text-zinc-900">
                    📍 Marbella — Puerto Banús
                  </p>
                </div>
                <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-4">
                  <p className="text-xs text-pink-600/70">Coordonnées envoyées</p>
                  <p className="mt-1 font-medium text-pink-600">
                    📍 Marbella, Espagne
                  </p>
                </div>
              </div>
              <p className="mt-4 text-center text-xs text-zinc-600">
                Même coords, même instant — un vrai signal GPS, pas un montage
                chelou.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
