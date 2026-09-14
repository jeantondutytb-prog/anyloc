"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AuthDivider } from "@/components/auth/auth-divider";
import { GoogleAuthLink } from "@/components/auth/google-auth-link";
import { StripeEmbeddedCheckout } from "@/components/checkout/stripe-embedded-checkout";
import {
  LOCAFLEX_ANNUAL_EXTRA_PERKS,
  LOCAFLEX_BASE_PERKS,
  LOCAFLEX_CHECKOUT_COPY,
  LOCAFLEX_CHECKOUT_PLAN_IDS,
  LOCAFLEX_PROOF_IMAGES,
  LOCAFLEX_REVIEWS,
} from "@/lib/checkout-locaflex-copy";
import { PLANS, type Plan } from "@/lib/constants";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";
import { cn } from "@/lib/utils";

function Stars({ count }: { count: number }) {
  return (
    <span className="text-[13px] leading-none tracking-tight text-[#f5a623]">
      {"★".repeat(count)}
    </span>
  );
}

function ProofMarquee() {
  const items = [...LOCAFLEX_PROOF_IMAGES, ...LOCAFLEX_PROOF_IMAGES];

  return (
    <div className="proof-marquee relative w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[var(--lf-surface-2)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[var(--lf-surface-2)] to-transparent" />
      <div className="proof-track flex w-max">
        {items.map((item, index) => (
          <div key={`${item.src}-${index}`} className="mx-2 flex-shrink-0">
            <div className="group relative overflow-hidden rounded-2xl border border-[var(--lf-line)] bg-[var(--lf-ink)] shadow-[0_10px_30px_rgba(11,11,15,0.12)] transition-transform duration-300 hover:scale-[1.03]">
              <img
                src={item.src}
                alt={`Position à ${item.city}`}
                className="h-[280px] w-[280px] object-cover sm:h-[340px] sm:w-[340px]"
                loading="lazy"
                draggable={false}
              />
              <div className="absolute left-2.5 top-2.5">
                {item.kind === "map" ? (
                  <span className="inline-flex items-center rounded-full bg-[var(--lf-accent)] px-2.5 py-1 text-[11px] font-bold text-[var(--lf-ink)] shadow">
                    Sur ta map
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-[var(--lf-ink)] shadow">
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
  const reviews = [...LOCAFLEX_REVIEWS, ...LOCAFLEX_REVIEWS];
  const average =
    Math.round(
      (LOCAFLEX_REVIEWS.reduce((sum, review) => sum + review.stars, 0) /
        LOCAFLEX_REVIEWS.length) *
        10
    ) / 10;

  return (
    <div className="mt-10">
      <h3 className="text-center text-lg font-extrabold tracking-tight">
        {LOCAFLEX_CHECKOUT_COPY.reviewsTitle}
      </h3>
      <p className="mt-1 flex items-center justify-center gap-2 text-sm text-[var(--lf-muted)]">
        <Stars count={5} />
        <span className="font-bold text-[var(--lf-ink)]">
          {average.toString().replace(".", ",")}/5
        </span>
      </p>
      <div className="reviews-marquee relative mt-5 w-full overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[var(--lf-surface-2)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[var(--lf-surface-2)] to-transparent" />
        <div className="reviews-track flex w-max">
          {reviews.map((review, index) => (
            <figure
              key={`${review.name}-${index}`}
              className="mx-2 flex h-full w-[260px] flex-shrink-0 flex-col justify-between rounded-2xl border border-[var(--lf-line)] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] sm:w-[300px]"
            >
              <Stars count={review.stars} />
              <blockquote className="mt-2 text-sm leading-snug text-[var(--lf-ink)]">
                « {review.text} »
              </blockquote>
              <figcaption className="mt-3 flex items-center gap-2 text-xs">
                <span className="font-bold text-[var(--lf-ink)]">
                  {review.name}
                </span>
                <span className="inline-flex items-center gap-1 text-[var(--lf-muted)]">
                  <span aria-hidden="true">✓</span>
                  {LOCAFLEX_CHECKOUT_COPY.reviewsVerified}
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
        <div className="text-sm font-bold text-[var(--lf-ink)]">
          {LOCAFLEX_CHECKOUT_COPY.secureTitle}
        </div>
        <div className="text-xs text-[var(--lf-muted)]">
          {LOCAFLEX_CHECKOUT_COPY.ssl}
        </div>
      </div>
    </div>
  );
}

function getCheckoutPlans() {
  return LOCAFLEX_CHECKOUT_PLAN_IDS.map((id) => {
    const plan = PLANS.find((entry) => entry.id === id)!;
    return plan;
  });
}

const BOLD_PERKS = new Set<string>(LOCAFLEX_ANNUAL_EXTRA_PERKS);

function getPlanPerks(plan: Plan) {
  if (plan.id === "annual") {
    return [...LOCAFLEX_ANNUAL_EXTRA_PERKS, ...LOCAFLEX_BASE_PERKS];
  }

  return [...LOCAFLEX_BASE_PERKS];
}

function getPlanPerMonth(plan: Plan) {
  if (plan.id === "6months") {
    return "≈ 5,82 €/mois";
  }

  return "≈ 4,16 €/mois";
}

function getPlanCadence(plan: Plan) {
  return plan.id === "6months" ? "/ 6 mois" : "/ an";
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

export function LocaflexCheckoutPanel({
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
  const copy = LOCAFLEX_CHECKOUT_COPY;
  const checkoutPlans = getCheckoutPlans();
  const selectedPlan =
    checkoutPlans.find((plan) => plan.id === selectedPlanId) ??
    checkoutPlans.find((plan) => plan.id === "annual")!;
  const [bumpSelected, setBumpSelected] = useState(true);
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

  return (
    <div
      className="locaflex-checkout mx-auto max-w-3xl text-[var(--lf-ink)]"
      style={{
        ["--lf-bg" as string]: "#ffffff",
        ["--lf-surface-2" as string]: "#f5f5f7",
        ["--lf-line" as string]: "#e7e7ea",
        ["--lf-ink" as string]: "#0b0b0f",
        ["--lf-muted" as string]: "#5b5b66",
        ["--lf-accent" as string]: "#fffc00",
        ["--lf-guarantee" as string]: "#1d4ed8",
        ["--lf-guarantee-bg" as string]: "#eff4ff",
        ["--lf-guarantee-line" as string]: "#c9dbff",
      }}
    >
      {canceled && (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Paiement annulé. Reprends quand tu veux — ta formule reste sélectionnée.
        </p>
      )}

      <p className="text-center text-xs font-bold text-[var(--lf-muted)]">
        {copy.scarcity}
      </p>

      <h1 className="mt-4 text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
        {copy.h1a}
        <br />
        {copy.h1b}
      </h1>

      <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-[var(--lf-muted)] sm:text-base">
        {copy.subA}
        <span className="font-bold text-[var(--lf-ink)]">{copy.subHl}</span>
        {copy.subB}
      </p>

      {destination ? (
        <p className="mt-4 text-center text-sm font-semibold text-[var(--lf-ink)]">
          {destination.emoji} Destination choisie : {destination.city}
        </p>
      ) : null}

      <h2 className="mt-8 text-lg font-extrabold tracking-tight">
        {copy.valueTitle}
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {copy.included.map((item) => (
          <div
            key={item.t}
            className="rounded-2xl border border-[var(--lf-line)] bg-white p-4"
          >
            <p className="text-sm font-bold text-[var(--lf-ink)]">{item.t}</p>
            <p className="mt-1 text-sm leading-snug text-[var(--lf-muted)]">
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
        <p className="mx-auto mt-1 max-w-sm text-center text-sm text-[var(--lf-muted)]">
          {copy.proofSub}
        </p>
        <div className="mt-5">
          <ProofMarquee />
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-extrabold tracking-tight">
          {copy.selectTitle}
        </h2>
        <p className="mt-1 text-sm text-[var(--lf-muted)]">{copy.selectSub}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {checkoutPlans.map((plan) => {
          const selected = plan.id === selectedPlanId;
          const perks = getPlanPerks(plan);
          const perMonth = getPlanPerMonth(plan);
          const cadence = getPlanCadence(plan);

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => selectPlan(plan.id)}
              className={cn(
                "relative rounded-2xl border-2 p-5 text-left transition",
                selected
                  ? "border-[var(--lf-ink)] bg-[var(--lf-accent)]/10"
                  : "border-[var(--lf-line)] bg-white hover:border-[var(--lf-muted)]"
              )}
            >
              {plan.badge && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-[var(--lf-accent)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--lf-ink)]">
                  {plan.badge}
                </span>
              )}

              <div className="flex items-center justify-between">
                <span className="font-bold">{plan.name}</span>
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border-2",
                    selected
                      ? "border-[var(--lf-ink)] bg-[var(--lf-ink)] text-white"
                      : "border-[var(--lf-line)]"
                  )}
                >
                  {selected ? <span className="text-[10px]">✓</span> : null}
                </span>
              </div>

              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold">
                  {perMonth.replace("≈ ", "").replace("/mois", "")}
                </span>
                <span className="text-xs text-[var(--lf-muted)]">/mois</span>
              </div>

              <div className="mt-1 text-xs font-semibold text-[var(--lf-ink)]">
                Facturé {plan.price.replace("€", " €")} {cadence}
              </div>

              {plan.compare && (
                <div
                  className={cn(
                    "mt-1 text-[11px] leading-snug",
                    plan.id === "annual"
                      ? "font-bold text-[var(--lf-ink)]"
                      : "text-[var(--lf-muted)]"
                  )}
                >
                  {plan.id === "annual" ? "✓ " : ""}
                  {plan.compare}
                </div>
              )}

              <div
                className="mt-3 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold"
                style={{
                  color: "var(--lf-guarantee)",
                  backgroundColor: "var(--lf-guarantee-bg)",
                  borderColor: "var(--lf-guarantee-line)",
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

              <div className="mt-4 border-t border-[var(--lf-line)] pt-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--lf-muted)]">
                  {copy.perksTitle}
                </div>
                <ul className="mt-2 space-y-1.5">
                  {perks.map((perk) => (
                    <li
                      key={perk}
                      className="flex gap-1.5 text-[11px] leading-snug"
                    >
                      <span
                        aria-hidden="true"
                        className="shrink-0 font-bold"
                        style={{ color: "var(--lf-guarantee)" }}
                      >
                        ✓
                      </span>
                      <span
                        className={cn(
                          BOLD_PERKS.has(perk)
                            ? "font-bold text-[var(--lf-ink)]"
                            : "text-[var(--lf-muted)]"
                        )}
                      >
                        {perk}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {plan.id === "annual" && (
                <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-[var(--lf-accent)]/25 px-2 py-1.5">
                  <span aria-hidden="true" className="text-[11px] leading-tight">
                    🎁
                  </span>
                  <span className="text-[11px] font-extrabold leading-tight text-[var(--lf-ink)]">
                    Studio IA inclus gratuitement 1 mois
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setBumpSelected((current) => !current)}
        aria-pressed={bumpSelected}
        className={cn(
          "mt-4 flex w-full items-start gap-3 rounded-2xl border-2 border-dashed p-4 text-left transition",
          bumpSelected
            ? "border-[var(--lf-ink)] bg-[var(--lf-accent)]/15"
            : "border-[var(--lf-line)] bg-white hover:border-[var(--lf-muted)]"
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
            bumpSelected
              ? "border-[var(--lf-ink)] bg-[var(--lf-ink)] text-white"
              : "border-[var(--lf-line)]"
          )}
        >
          {bumpSelected ? (
            <span className="text-[11px] leading-none">✓</span>
          ) : null}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-bold">⭐ {copy.bumpHeadline}</span>
            <span className="rounded-full bg-[var(--lf-ink)] px-2 py-0.5 text-[11px] font-bold text-white">
              +{copy.bumpPrice}
            </span>
            <span className="rounded-full bg-[var(--lf-accent)] px-2 py-0.5 text-[11px] font-bold text-[var(--lf-ink)]">
              {copy.bumpRecommended}
            </span>
          </span>
          <span className="mt-1 block text-sm text-[var(--lf-muted)]">
            {copy.bumpBlurb}
          </span>
          <span className="mt-1.5 block text-xs font-semibold text-[var(--lf-ink)]">
            {copy.bumpNudge}
          </span>
        </span>
      </button>

      <div className="mt-6 rounded-2xl border-2 border-[var(--lf-ink)] bg-[var(--lf-accent)]/10 p-4">
        <div className="text-sm font-semibold text-[var(--lf-ink)]">
          {copy.recapUnlock}
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-[var(--lf-line)] pt-3">
          <span className="text-sm font-bold text-[var(--lf-ink)]">
            {selectedPlan.name}
            {bumpSelected && (
              <span className="font-semibold text-[var(--lf-muted)]">
                {" "}
                + {copy.bumpHeadline} ({copy.bumpPrice})
              </span>
            )}
          </span>
          <span className="shrink-0 whitespace-nowrap">
            <span className="text-xl font-extrabold text-[var(--lf-ink)]">
              {selectedPlan.price.replace("€", " €")}
            </span>
            <span className="text-xs text-[var(--lf-muted)]">
              {" "}
              {getPlanCadence(selectedPlan)}
            </span>
          </span>
        </div>
        <div className="mt-3 flex items-start gap-2 text-xs font-semibold text-[var(--lf-ink)]">
          <span aria-hidden="true">✅</span>
          <span>{copy.guarantee}</span>
        </div>
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
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 text-sm font-semibold text-[var(--lf-ink)] backdrop-blur-[1px]">
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
              className="mt-3 rounded-full bg-[var(--lf-ink)] px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              Continuer vers le paiement sécurisé
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm font-semibold text-[var(--lf-muted)]">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--lf-line)] border-t-[var(--lf-ink)]" />
            {copy.payOpening}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center text-sm font-bold text-[var(--lf-ink)]">
        {copy.trust.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--lf-line)] bg-[var(--lf-surface-2)] p-4">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center text-sm font-bold text-[var(--lf-ink)]">
          <span>↩︎ {copy.reassure[1]}</span>
          <span>⚡ {copy.reassure[2]}</span>
        </div>
        <div className="mt-4 border-t border-[var(--lf-line)] pt-4">
          <SecurePaymentBadge />
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] leading-snug text-[var(--lf-muted)]">
        {consentParts[0]}
        <Link
          href="/conditions-generales"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-[var(--lf-ink)]"
        >
          {copy.consentCgv}
        </Link>
        {consentParts[1]}
      </p>

      <div className="mt-8 rounded-2xl border border-[var(--lf-line)] bg-[var(--lf-surface-2)] p-5">
        <h3 className="text-sm font-extrabold tracking-tight">
          {copy.faqTitle}
        </h3>
        <dl className="mt-3 space-y-3">
          {copy.faq.map((item) => (
            <div key={item.q}>
              <dt className="text-sm font-bold text-[var(--lf-ink)]">
                {item.q}
              </dt>
              <dd className="mt-0.5 text-sm leading-snug text-[var(--lf-muted)]">
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
          className="mt-6 w-full text-center text-sm text-[var(--lf-muted)] transition-colors hover:text-[var(--lf-ink)]"
        >
          Changer de destination
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
