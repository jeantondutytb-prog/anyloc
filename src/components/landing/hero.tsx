"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VslPlayer } from "@/components/landing/vsl-player";
import {
  CHECKOUT_CTA_LABEL,
  DEFAULT_PLAN_ID,
  getOnboardingUrl,
} from "@/lib/constants";
import { OnboardingLink } from "@/components/onboarding/onboarding-link";

export function Hero() {
  return (
    <section data-track-section="hero" className="pt-[calc(var(--header-height)+3rem)] pb-16 sm:pt-[calc(var(--header-height)+5rem)] sm:pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl sm:leading-[1.1]">
            Fake ta loc à{" "}
            <span className="text-pink-600">
              Marbella
            </span>
            <br />
            alors que t&apos;es posé chez toi.
          </h1>

          <p className="mt-6 text-lg text-zinc-600 sm:text-xl">
            Snap, Insta, Tinder, jeux : un réglage et tout ton tel déménage.
          </p>

          <div className="mt-8 flex flex-col items-center gap-2">
            <OnboardingLink href={getOnboardingUrl(DEFAULT_PLAN_ID)} data-track="cta_clicked" data-track-location="hero" data-track-plan={DEFAULT_PLAN_ID}>
              <Button size="lg" className="w-full sm:w-auto">
                {CHECKOUT_CTA_LABEL}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </OnboardingLink>
            <p className="text-center text-xs text-zinc-500 sm:text-sm">
              iPhone &amp; Android · Annulation en 1 clic
            </p>
          </div>

          <p className="mt-4 text-sm text-zinc-500">
            Déjà client ?{" "}
            <Link
              href="/login"
              data-track="login_link_clicked"
              data-track-location="hero"
              className="font-medium text-pink-600 transition-colors hover:text-pink-700 hover:underline"
            >
              Connexion
            </Link>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative mx-auto mt-16 max-w-4xl"
        >
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1 shadow-xl shadow-zinc-900/5">
            <VslPlayer />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
