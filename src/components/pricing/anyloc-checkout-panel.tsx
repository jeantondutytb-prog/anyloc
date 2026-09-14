"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AuthDivider } from "@/components/auth/auth-divider";
import { GoogleAuthLink } from "@/components/auth/google-auth-link";
import { StripeEmbeddedCheckout } from "@/components/checkout/stripe-embedded-checkout";
import { PaywallValueStack } from "@/components/pricing/paywall-value-stack";
import { PlanPrice } from "@/components/pricing/plan-price";
import {
  CHECKOUT_ANNUAL_EXTRA_PERKS,
  CHECKOUT_COPY,
  CHECKOUT_PLAN_IDS,
  CHECKOUT_PROOF_IMAGES,
  CHECKOUT_REVIEWS,
  getCheckoutHeadline,
} from "@/lib/checkout-copy";
import { PLANS } from "@/lib/constants";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";
import { cn } from "@/lib/utils";

function Stars({ count }: { count: number }) {
  return (
    <span className="text-[13px] leading-none tracking-tight text-pink-500">
      {"★".repeat(count)}
    </span>
  );
}

function ProofMarquee() {
  const items = [...CHECKOUT_PROOF_IMAGES, ...CHECKOUT_PROOF_IMAGES];

  return (
    <div className="proof-marquee relative w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[var(--al-surface-2)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[var(--al-surface-2)] to-transparent" />
      <div className="proof-track flex w-max">
        {items.map((item, index) => (
          <div key={`${item.src}-${index}`} className="mx-2 flex-shrink-0">
            <div className="group relative overflow-hidden rounded-2xl border border-[var(--al-line)] bg-zinc-900 shadow-[0_10px_30px_rgba(236,72,153,0.12)] transition-transform duration-300 hover:scale-[1.03]">
              <img
                src={item.src}
                alt={`Position à ${item.city}`}
                className="h-[280px] w-[280px] object-cover sm:h-[340px] sm:w-[340px]"
                loading="lazy"
                draggable={false}
              />
              <div className="absolute left-2.5 top-2.5">
                {item.kind === "map" ? (
                  <span className="inline-flex items-center rounded-full bg-pink-500 px-2.5 py-1 text-[11px] font-bold text-white shadow">
                    Sur ta map
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-zinc-900 shadow">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2f6bff]" />
                    Position système
                  </span>
                )}
              </div>
              <div className="absolute bottom-2.5 left-2.5">
                <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                  📍 {item.city}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes proof-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .proof-track {
          animation: proof-scroll 45s linear infinite;
          will-change: transform;
        }
        .proof-marquee:hover .proof-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .proof-track {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

function ReviewsMarquee() {
  const reviews = [...CHECKOUT_REVIEWS, ...CHECKOUT_REVIEWS];
  const average =
    Math.round(
      (CHECKOUT_REVIEWS.reduce((sum, review) => sum + review.stars, 0) /
        CHECKOUT_REVIEWS.length) *
        10
    ) / 10;

  return (
    <div className="mt-10">
      <h3 className="text-center text-lg font-extrabold tracking-tight">
        {CHECKOUT_COPY.reviewsTitle}
      </h3>
      <p className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Stars count={5} />
        <span className="font-bold text-foreground">
          {average.toString().replace(".", ",")}/5
        </span>
      </p>
      <div className="reviews-marquee relative mt-5 w-full overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[var(--al-surface-2)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[var(--al-surface-2)] to-transparent" />
        <div className="reviews-track flex w-max">
          {reviews.map((review, index) => (
            <figure
              key={`${review.name}-${index}`}
              className="mx-2 flex h-full w-[260px] flex-shrink-0 flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(236,72,153,0.06)] sm:w-[300px]"
            >
              <Stars count={review.stars} />
              <blockquote className="mt-2 text-sm leading-snug text-foreground">
                « {review.text} »
              </blockquote>
              <figcaption className="mt-3 flex items-center gap-2 text-xs">
                <span className="font-bold text-foreground">
                  {review.name}
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <span aria-hidden="true">✓</span>
                  {CHECKOUT_COPY.reviewsVerified}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        <style jsx>{`
          @keyframes reviews-scroll {
            0% {
              transform: translateX(-50%);
            }
            100% {
              transform: translateX(0);
            }
          }
          .reviews-track {
            animation: reviews-scroll 50s linear infinite;
            will-change: transform;
            align-items: stretch;
          }
          .reviews-marquee:hover .reviews-track {
            animation-play-state: paused;
          }
          @media (prefers-reduced-motion: reduce) {
            .reviews-track {
              animation: none;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

function SecurePaymentBadge() {
  return (
    <div className="flex items-center justify-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 2.5 4.5 5.4v5.2c0 4.6 3.1 8.3 7.5 9.9 4.4-1.6 7.5-5.3 7.5-9.9V5.4L12 2.5Z"
            fill="#059669"
          />
          <rect x="8.4" y="11" width="7.2" height="5.4" rx="1.2" fill="white" />
          <path
            d="M9.7 11V9.7a2.3 2.3 0 0 1 4.6 0V11"
            stroke="white"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="12" cy="13.4" r="0.9" fill="#059669" />
        </svg>
      </span>
      <div className="text-left leading-tight">
        <div className="text-sm font-bold text-foreground">
          {CHECKOUT_COPY.secureTitle}
        </div>
        <div className="text-xs text-muted-foreground">
          {CHECKOUT_COPY.ssl}
        </div>
      </div>
    </div>
  );
}

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
  const startedRef = useRef(false);

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
        body: JSON.stringify({ planId }),
        signal: controller.signal,
      });
      const data = await parseJsonResponse(res);

      if (!res.ok || !data.clientSecret) {
        throw new Error(data.error ?? copy.errStart);
      }

      if (requestRef.current === controller) {
        setClientSecret(data.clientSecret);
        startedRef.current = true;
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
    if (planId === selectedPlanId) return;
    onPlanChange(planId);
  }

  useEffect(() => {
    setClientSecret(null);
    setError(null);
    void startCheckout(selectedPlanId, true);
    return () => requestRef.current?.abort();
  }, [selectedPlanId]);

  const consentParts = copy.consent.split("{cgv}");
  const headline = getCheckoutHeadline(destination?.city);

  return (
    <div
      className="anyloc-checkout mx-auto max-w-6xl text-foreground"
      style={{
        ["--al-bg" as string]: "#fff9fb",
        ["--al-surface-2" as string]: "#fdf2f8",
        ["--al-line" as string]: "#e4e4e7",
        ["--al-accent" as string]: "#ec4899",
        ["--al-accent-soft" as string]: "#fce7f3",
        ["--al-violet" as string]: "#a855f7",
        ["--al-guarantee" as string]: "#db2777",
        ["--al-guarantee-bg" as string]: "#fdf2f8",
        ["--al-guarantee-line" as string]: "#fbcfe8",
      }}
    >
      {canceled && (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {copy.canceled}
        </p>
      )}

      <p className="text-center text-xs font-semibold text-pink-600">
        {copy.scarcity}
      </p>

      <h1 className="mt-4 text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
        {headline.before}{" "}
        <span className="gradient-text">{headline.highlight}</span>
        {headline.after ? (
          <>
            <br />
            {headline.after}
          </>
        ) : null}
      </h1>

      <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
        {copy.subA}
        <span className="font-bold text-foreground">{copy.subHl}</span>
        {copy.subB}
      </p>

      {destination ? (
        <p className="mt-4 text-center text-sm font-semibold text-foreground">
          {destination.emoji} {copy.destinationLabel} : {destination.city}
        </p>
      ) : null}

      <h2 className="mt-8 text-lg font-extrabold tracking-tight">
        {copy.valueTitle}
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {copy.included.map((item) => (
          <div
            key={item.t}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <p className="text-sm font-bold text-foreground">{item.t}</p>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              {item.d}
            </p>
          </div>
        ))}
      </div>

      <ReviewsMarquee />

      <div className="mb-8 mt-10">
        <h3 className="text-center text-lg font-extrabold tracking-tight">
          {copy.proofTitle}
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-center text-sm text-muted-foreground">
          {copy.proofSub}
        </p>
        <div className="mt-5">
          <ProofMarquee />
        </div>
      </div>

      <div className="mx-auto max-w-3xl">
        <h2 className="text-xl font-extrabold tracking-tight">
          {copy.selectTitle}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.selectSub}</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {checkoutPlans.map((plan) => {
          const selected = plan.id === selectedPlanId;

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => selectPlan(plan.id)}
              className={cn(
                "relative flex flex-col rounded-2xl border-2 p-5 text-left transition",
                selected
                  ? "border-pink-500 bg-pink-500/5 shadow-lg shadow-pink-500/10"
                  : "border-border bg-card hover:border-pink-300",
                plan.popular && !selected && "border-pink-500/30"
              )}
            >
              {plan.popular ? (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-pink-500 px-2.5 py-0.5 text-[11px] font-bold text-white">
                  Le plus populaire
                </span>
              ) : plan.badge ? (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-pink-500 px-2.5 py-0.5 text-[11px] font-bold text-white">
                  {plan.badge}
                </span>
              ) : null}

              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">{plan.name}</span>
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                    selected
                      ? "border-pink-500 bg-pink-500 text-white"
                      : "border-border"
                  )}
                >
                  {selected ? <span className="text-[10px]">✓</span> : null}
                </span>
              </div>

              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Accès Anyloc complet
              </p>

              <PlanPrice plan={plan} size="card" className="mt-3" />

              {plan.savings ? (
                <p className="mt-1 text-sm font-medium text-pink-600">{plan.savings}</p>
              ) : plan.compare ? (
                <p className="mt-1 text-xs text-muted-foreground">{plan.compare}</p>
              ) : null}

              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

              <PaywallValueStack
                className="mt-4 flex-1 border-t border-border pt-4"
                compact
              />

              <div
                className="mt-4 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold"
                style={{
                  color: "var(--al-guarantee)",
                  backgroundColor: "var(--al-guarantee-bg)",
                  borderColor: "var(--al-guarantee-line)",
                }}
              >
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0"
                  fill="currentColor"
                >
                  <path
                    d="M10 1.5 3.5 4v5.2c0 3.9 2.6 7.5 6.5 9.3 3.9-1.8 6.5-5.4 6.5-9.3V4L10 1.5Zm3.4 6.2-4.1 4.6a.9.9 0 0 1-1.3.05L6.6 10.9a.9.9 0 0 1 1.2-1.3l1.1 1 3.5-3.9a.9.9 0 1 1 1.3 1.2Z"
                  />
                </svg>
                <span>{copy.guaranteeBadge}</span>
              </div>

              {plan.id === "annual" ? (
                <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-violet-500/10 px-2 py-1.5">
                  <span aria-hidden="true" className="text-[11px] leading-tight">
                    🎁
                  </span>
                  <span className="text-[11px] font-extrabold leading-tight text-violet-700">
                    {CHECKOUT_ANNUAL_EXTRA_PERKS[0]}
                  </span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      {googleAuthRedirectTo ? (
        <div className="mt-6">
          <GoogleAuthLink redirectTo={googleAuthRedirectTo} />
          <AuthDivider />
        </div>
      ) : null}

      <div className="relative mt-3 min-h-[140px]">
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
            {copy.payOpening}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center text-sm font-bold text-foreground">
        {copy.trust.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-[var(--al-surface-2)] p-4">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center text-sm font-bold text-foreground">
          <span>↩︎ {copy.reassure[1]}</span>
          <span>⚡ {copy.reassure[2]}</span>
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <SecurePaymentBadge />
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] leading-snug text-muted-foreground">
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

      <div className="mt-8 rounded-2xl border border-border bg-[var(--al-surface-2)] p-5">
        <h3 className="text-sm font-extrabold tracking-tight">
          {copy.faqTitle}
        </h3>
        <dl className="mt-3 space-y-3">
          {copy.faq.map((item) => (
            <div key={item.q}>
              <dt className="text-sm font-bold text-foreground">
                {item.q}
              </dt>
              <dd className="mt-0.5 text-sm leading-snug text-muted-foreground">
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
