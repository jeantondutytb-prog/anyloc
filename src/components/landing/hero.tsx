"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VslPlayer } from "@/components/landing/vsl-player";
import {
  CHECKOUT_CTA_LABEL,
  DEFAULT_PLAN_ID,
  getOnboardingUrl,
  SITE,
} from "@/lib/constants";
import { OnboardingLink } from "@/components/onboarding/onboarding-link";
import { useHasSession } from "@/lib/use-has-session";

const HERO_CHECKS = ["iOS + Android", "Zéro jailbreak", "Annulation en 1 clic"];

export function Hero() {
  // Already logged in on this device: straight to the dashboard, no onboarding.
  const hasSession = useHasSession();

  return (
    <section data-track-section="hero" className="relative overflow-hidden pt-[120px] pb-20 sm:pt-28 sm:pb-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-pink-500/10 blur-[120px]" />
        <div className="absolute top-0 right-0 h-[300px] w-[400px] rounded-full bg-violet-500/10 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[250px] w-[350px] rounded-full bg-violet-500/8 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* No fade-in: the headline is the LCP element, it must paint with the HTML. */}
        <motion.div
          initial={{ y: 12 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
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

          <div className="mt-8 flex flex-col items-center">
            {hasSession ? (
              <Link href="/dashboard" data-track="dashboard_link_clicked" data-track-location="hero">
                <Button size="lg" className="w-full sm:w-auto">
                  Accéder à mon espace
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <OnboardingLink href={getOnboardingUrl(DEFAULT_PLAN_ID)} data-track="cta_clicked" data-track-location="hero" data-track-plan={DEFAULT_PLAN_ID}>
                <Button size="lg" className="w-full sm:w-auto">
                  {CHECKOUT_CTA_LABEL}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </OnboardingLink>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-zinc-500">
            {HERO_CHECKS.map((label) => (
              <span key={label} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-pink-600" />
                {label}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative mx-auto mt-16 max-w-4xl"
        >
          <div className="overflow-hidden rounded-2xl border border-pink-500/15 bg-gradient-to-b from-pink-500/10 via-violet-500/5 to-transparent p-1 shadow-2xl shadow-pink-500/10">
            <VslPlayer />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
