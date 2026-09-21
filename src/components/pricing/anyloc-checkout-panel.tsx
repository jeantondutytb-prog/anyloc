"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CreditCard, ShieldCheck, XCircle, Zap } from "lucide-react";
import posthog from "posthog-js";
import {
  initPostHogBrowser,
  isPostHogBrowserReady,
} from "@/lib/posthog/browser";
import { AuthDivider } from "@/components/auth/auth-divider";
import { GoogleAuthLink } from "@/components/auth/google-auth-link";
import { StripeEmbeddedCheckout } from "@/components/checkout/stripe-embedded-checkout";
import { CheckoutProofCarousel } from "@/components/pricing/checkout-proof-carousel";
import { CheckoutReviewsGrid } from "@/components/pricing/checkout-reviews-grid";
import { PaywallValueStack } from "@/components/pricing/paywall-value-stack";
import { PlanPrice } from "@/components/pricing/plan-price";
import { RefundGuaranteeNotice } from "@/components/pricing/refund-guarantee-notice";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  CHECKOUT_COPY,
  CHECKOUT_PLAN_IDS,
  getCheckoutHeadline,
} from "@/lib/checkout-copy";
import { PLANS } from "@/lib/constants";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";
import { TRIAL_HEADLINE } from "@/lib/trial";
import { cn } from "@/lib/utils";

function getCheckoutPlans() {
  return CHECKOUT_PLAN_IDS.map((id) => {
    const plan = PLANS.find((entry) => entry.id === id)!;
    return plan;
  });
}

async function parseJsonResponse(res: Response) {
  const text = await res.text();
  if (!text) {
    throw new Error("Réponse serveur vide. Réessaie dans quelques instants.");
  }

  try {
    return JSON.parse(text) as { clientSecret?: string; error?: string };
  } catch {
    throw new Error("Réponse serveur invalide. Réessaie dans quelques instants.");
  }
}

export function AnyLocCheckoutPanel({
  selectedPlanId,
  onPlanChange,
  stripePublishableKey,
  destination,
  googleAuthRedirectTo,
  onBack,
  canceled,
}: {
  selectedPlanId: string;
  onPlanChange: (planId: string) => void;
  stripePublishableKey: string;
  destination?: OnboardingDestination;
  googleAuthRedirectTo?: string;
  onBack?: () => void;
  canceled?: boolean;
}) {
  const copy = CHECKOUT_COPY;
  const checkoutPlans = getCheckoutPlans();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const paymentSectionRef = useRef<HTMLDivElement>(null);
  const [skipTrial, setSkipTrial] = useState<boolean | null>(null);

  function scrollToPayment() {
    requestAnimationFrame(() => {
      paymentSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  async function startCheckout(planId: string, isInitial = false) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    if (isInitial) {
      setLoading(true);
    } else {
      setUpdating(true);
    }
    setError(null);

    try {
      const res = await fetch("/api/stripe/embedded-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, skipTrial: skipTrial ?? false }),
        signal: controller.signal,
      });
      const data = await parseJsonResponse(res);

      if (!res.ok || !data.clientSecret) {
        throw new Error(data.error ?? copy.errStart);
      }

      if (requestRef.current === controller) {
        setClientSecret(data.clientSecret);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : copy.errGeneric);
    } finally {
      if (requestRef.current === controller) {
        setLoading(false);
        setUpdating(false);
      }
    }
  }

  function selectPlan(planId: string) {
    if (planId !== selectedPlanId) {
      onPlanChange(planId);
    }
    scrollToPayment();
  }

  useEffect(() => {
    initPostHogBrowser();
    if (!isPostHogBrowserReady()) {
      setSkipTrial(false);
      return;
    }
    posthog.onFeatureFlags(() => {
      setSkipTrial(posthog.isFeatureEnabled("checkout-no-trial") ?? false);
    });
    const timer = setTimeout(() => setSkipTrial((v) => v ?? false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (skipTrial === null) return;
    setClientSecret(null);
    setError(null);
    void startCheckout(selectedPlanId, true);
    return () => requestRef.current?.abort();
  }, [selectedPlanId, skipTrial]);

  const consentParts = copy.consent.split("{cgv}");
  const headline = getCheckoutHeadline(destination?.city);

  return (
    <div className="anyloc-checkout mx-auto max-w-6xl px-4 sm:px-6">
      {canceled && (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {copy.canceled}
        </p>
      )}

      <p className="text-center text-xs font-semibold text-pink-600">
        {copy.scarcity}
      </p>

      <h1 className="mx-auto mt-4 max-w-3xl text-center text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
        {headline.before}{" "}
        <span className="gradient-text">{headline.highlight}</span>
        {headline.after ? (
          <>
            <br />
            {headline.after}
          </>
        ) : null}
      </h1>

      <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-zinc-600 sm:text-base">
        {copy.subA}
        <span className="font-semibold text-zinc-900">{copy.subHl}</span>
        {copy.subB}
      </p>

      {destination ? (
        <p className="mt-4 text-center text-sm font-semibold text-foreground">
          {destination.emoji} {copy.destinationLabel} : {destination.city}
        </p>
      ) : null}

      <div className="mt-8 sm:mt-10">
        <h3 className="text-center text-2xl font-bold tracking-tight text-zinc-900">
          {copy.proofTitle}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-zinc-600">
          {copy.proofSub}
        </p>
        <div className="mt-6">
          <CheckoutProofCarousel />
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-2xl text-center">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {copy.valueTitle}
        </h2>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {copy.included.map((item) => (
          <Card
            key={item.t}
            className="p-5 transition-colors hover:border-pink-500/20"
          >
            <p className="text-sm font-semibold text-zinc-900">{item.t}</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">{item.d}</p>
          </Card>
        ))}
      </div>

      <CheckoutReviewsGrid />

      <div className="mx-auto mt-16 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          {copy.selectTitle}
        </h2>
        <p className="mt-4 text-zinc-600">{copy.selectSub}</p>
        <p className="mt-2 text-sm font-medium text-pink-600">{copy.scarcity}</p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {checkoutPlans.map((plan) => {
          const selected = plan.id === selectedPlanId;

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => selectPlan(plan.id)}
              className="w-full text-left"
            >
              <Card
                className={cn(
                  "relative flex h-full flex-col p-6 transition",
                  plan.popular
                    ? "border-pink-500/40 bg-gradient-to-b from-pink-500/10 to-violet-500/5 ring-1 ring-pink-500/25"
                    : "",
                  selected && "ring-2 ring-pink-500"
                )}
              >
                {plan.popular ? (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Le plus populaire
                  </Badge>
                ) : null}
                {plan.badge && !plan.popular ? (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    {plan.badge}
                  </Badge>
                ) : null}

                <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
                <p className="mt-1 text-xs font-medium text-zinc-500">
                  Accès Anyloc complet
                </p>
                <PlanPrice plan={plan} size="landing" className="mt-4" />
                {plan.savings ? (
                  <p className="mt-1 text-sm text-pink-600">{plan.savings}</p>
                ) : null}
                {plan.compare && !plan.savings ? (
                  <p className="mt-1 text-xs text-zinc-500">{plan.compare}</p>
                ) : null}
                <p className="mt-2 text-sm text-zinc-500">{plan.description}</p>

                <PaywallValueStack
                  className="mt-5 flex-1 border-t border-zinc-100 pt-5"
                  compact
                  showHeading
                />

                <div
                  className={cn(
                    "mt-6 w-full rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition",
                    selected
                      ? "bg-pink-500 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  )}
                >
                  {selected ? "Plan sélectionné" : "Choisir ce plan"}
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      <RefundGuaranteeNotice className="mt-8 text-center text-sm text-zinc-600" />

      <div
        ref={paymentSectionRef}
        id="checkout-payment"
        className="mx-auto mt-12 max-w-2xl scroll-mt-28"
      >
        <h3 className="text-center text-lg font-semibold text-zinc-900">
          {skipTrial
            ? "Active ton accès complet"
            : "Teste gratuitement pendant 24 h — 0 € maintenant"}
        </h3>
        <p className="mt-2 text-center text-sm text-zinc-500">
          {skipTrial
            ? "Paiement sécurisé — accès immédiat à toutes les fonctionnalités."
            : TRIAL_HEADLINE}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-600">
          <span className="flex items-center gap-1.5">
            {skipTrial ? (
              <><Zap className="h-4 w-4 text-green-600" />Accès immédiat</>
            ) : (
              <><CreditCard className="h-4 w-4 text-green-600" />0 € prélevé aujourd'hui</>
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-pink-500" />
            Annulation en 1 clic
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-blue-500" />
            Garantie 48 h
          </span>
        </div>

        {googleAuthRedirectTo ? (
          <div className="mt-6">
            <GoogleAuthLink redirectTo={googleAuthRedirectTo} />
            <AuthDivider />
          </div>
        ) : null}

        <div className="relative mt-6 min-h-[140px]">
        {clientSecret ? (
          <div className="animate-[fadeIn_.3s_ease]">
            <StripeEmbeddedCheckout
              key={clientSecret}
              clientSecret={clientSecret}
              publishableKey={stripePublishableKey}
            />
            {updating ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 text-sm font-semibold text-foreground backdrop-blur-[1px]">
                {copy.updating}
              </div>
            ) : null}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => void startCheckout(selectedPlanId)}
              disabled={loading}
              className="mt-3 rounded-full btn-gradient px-6 py-2.5 text-sm font-bold transition hover:opacity-90 disabled:opacity-60"
            >
              {copy.retryCta}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm font-semibold text-muted-foreground">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-pink-500" />
            {skipTrial ? "Préparation du paiement…" : copy.payOpening}
          </div>
        )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-sm text-zinc-500">
          {(skipTrial ? copy.trust.filter((t) => !t.includes("0 €")) : copy.trust).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>

        <p className="mt-4 text-center text-xs leading-snug text-zinc-500">
        {consentParts[0]}
        <Link
          href="/conditions-generales"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-foreground"
        >
          {copy.consentCgv}
        </Link>
        {consentParts[1]}
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-3xl">
        <h3 className="text-center text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {copy.faqTitle}
        </h3>
        <dl className="mt-8 space-y-3">
          {(skipTrial ? copy.faq.slice(1) : copy.faq).map((item) => (
            <div
              key={item.q}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4"
            >
              <dt className="text-sm font-medium text-zinc-900">{item.q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-zinc-600">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mt-6 w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {copy.backCta}
        </button>
      ) : null}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
