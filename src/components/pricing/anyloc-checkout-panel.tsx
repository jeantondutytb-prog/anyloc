"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { preconnect } from "react-dom";
import { track } from "@/lib/analytics/track";
import {
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
  Star,
} from "lucide-react";
import { AuthDivider } from "@/components/auth/auth-divider";
import { GoogleAuthLink } from "@/components/auth/google-auth-link";
import { AnnualExitOfferSheet } from "@/components/checkout/annual-exit-offer-sheet";
import { CheckoutClipperSheet } from "@/components/checkout/checkout-clipper-sheet";
import { CheckoutDownsellSheet } from "@/components/checkout/checkout-downsell-sheet";
import { CheckoutPaymentModal } from "@/components/checkout/checkout-payment-modal";
import { CheckoutProofVideo } from "@/components/checkout/checkout-proof-video";
import { QuizPlanPage } from "@/components/checkout/quiz-plan-page";
import {
  CHECKOUT_COPY,
  CHECKOUT_REVIEWS,
  getCheckoutHeadline,
  getReturningSubline,
  type ReturningCustomer,
} from "@/lib/checkout-copy";
import type { BackResult } from "@/lib/back-interception";
import { useBackInterception } from "@/hooks/use-back-interception";
import {
  ANNUAL_EXIT_OFFER_WINDOW_MS,
  ANNUAL_EXIT_OFFERS,
  getAnnualExitOfferPlanId,
  getOrPickAnnualExitOfferVariant,
  isAnnualExitOfferEnabled,
} from "@/lib/annual-exit-offer";
import { getOrPickClipperOfferVariant } from "@/lib/checkout-clipper-offer";
import {
  getFirstMonthOfferPrice,
  getOrPickCloseOfferVariant,
  isCloseOfferExperimentEnabled,
} from "@/lib/checkout-first-month-offer";
import { RECOVERY_OFFER_PLAN_ID } from "@/lib/checkout-recovery-plan";
import { CheckoutRequestError, isNetworkError, requestCheckoutSession } from "@/lib/checkout-request";
import { getMonthlyDisplayPrice, type PriceDisplayVariant } from "@/lib/price-display-experiment";
import {
  getGridEntryPlanId,
  getGridPlans,
  getPlanGrid,
  GUARANTEE,
  PLAN_VALUE_DETAILS,
  PLAN_VALUE_STACK,
} from "@/lib/constants";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";
import { atCity } from "@/lib/onboarding-destinations";
import type { QuizResult } from "@/lib/onboarding-quiz";
import { registerPostHogProperties } from "@/lib/posthog/browser";
import { getStripe } from "@/lib/stripe-browser";
import { cn } from "@/lib/utils";
import type { PaywallEmailOffer } from "@/lib/checkout-email-offer";

/** Apple logo outline (Simple Icons path, CC0): lucide's `Apple` is a fruit, not the brand. */
function AppleLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-1.5 -1.5 27 27"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
      aria-hidden
      // Outline like the lucide icons next to it; nudged up because the
      // leaf makes the glyph sit low against the text.
      className={cn("-translate-y-px", className)}
    >
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

function subscribeToNothing() {
  return () => {};
}

/** Milliseconds until `endsAt`, ticking every second; null before hydration. */
function useOfferTimeLeft(endsAt: string | null | undefined) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);
  if (!endsAt) return 0;
  return now === null ? null : Math.max(0, new Date(endsAt).getTime() - now);
}

/** 26 h 3 min 9 s -> "26:03:09". */
function formatTimeLeft(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
}

/** Small line under the daily price: what is actually billed, and for how long. */
const BILLING_PERIOD_LABELS: Record<string, string> = {
  monthly: "1 mois",
  "6months": "6 mois",
  annual: "12 mois",
  month_v2: "1 mois",
  quarter_v2: "3 mois",
  year_v2: "12 mois",
  monthly_v3: "1 mois",
  annual_v3: "12 mois",
  lifetime: "toujours",
};

export function AnyLocCheckoutPanel({
  selectedPlanId,
  onPlanChange,
  stripePublishableKey,
  destination,
  googleAuthRedirectTo,
  onBack,
  canceled,
  offerEndsAt,
  emailOffer,
  focusPayment,
  onShowAllPlans,
  returning,
  quiz,
  fromQuiz = false,
  autoPay = false,
  priceDisplay = "per_day",
  previewAnnualExit = false,
}: {
  selectedPlanId: string;
  onPlanChange: (planId: string) => void;
  stripePublishableKey: string;
  destination?: OnboardingDestination;
  googleAuthRedirectTo?: string;
  onBack?: () => void;
  canceled?: boolean;
  /** End (ISO) of the -50 % welcome offer: until then the monthly checkout carries the coupon. */
  offerEndsAt?: string | null;
  /** The 15-min email's discount while it runs: the checkout of these plans carries its coupon. */
  emailOffer?: PaywallEmailOffer | null;
  /** Arrived from an email: only the selected plan and the payment popup, no sales page. */
  focusPayment?: boolean;
  onShowAllPlans?: () => void;
  /** A former subscriber: welcome-back copy instead of the first-purchase one. */
  returning?: ReturningCustomer | null;
  /** Arrived from the quiz onboarding: recommended plan and personal headline. */
  quiz?: QuizResult | null;
  /** Arriving from the quiz: the paywall eases in from the first paint, before the quiz result is read. */
  fromQuiz?: boolean;
  /** Quiz arm, coming from the plan sheet (?payer=1): the payment popup opens on arrival. */
  autoPay?: boolean;
  /** A/B test: plans priced per day or per month (see lib/price-display-experiment). */
  priceDisplay?: PriceDisplayVariant;
  /** Dev preview only (/checkout?preview=1&sortie=1): open on the annual exit offer sheet. */
  previewAnnualExit?: boolean;
}) {
  const copy = CHECKOUT_COPY;
  const offerTimeLeft = useOfferTimeLeft(offerEndsAt);
  // The server only grants the coupon before the end: past it, back to full price.
  const recoveryOffer = offerTimeLeft === null || offerTimeLeft > 0;
  const emailOfferTimeLeft = useOfferTimeLeft(emailOffer?.endsAt ?? null);
  // The plans of the selected plan's price grid (see lib/pricing-experiment).
  const checkoutPlans = getGridPlans(getPlanGrid(selectedPlanId));
  const selectedPlan =
    checkoutPlans.find((plan) => plan.id === selectedPlanId) ?? checkoutPlans[0];
  // Card declined (or popup closed) on a pricier plan: offer the shortest one.
  const entryPlanId = getGridEntryPlanId(selectedPlan.id);
  const entryPlan = checkoutPlans.find((plan) => plan.id === entryPlanId) ?? selectedPlan;
  // Same rule as the server: the discount stops at its end, on the plans it covers.
  const emailOfferPrice =
    emailOffer && (emailOfferTimeLeft === null || emailOfferTimeLeft > 0)
      ? emailOffer.prices[selectedPlan.id] ?? null
      : null;
  const downgradePlan = selectedPlan.id !== entryPlanId ? entryPlan : undefined;
  // Checkout refused for lack of funds (or closed, in the A/B test) that
  // unlocks the shortest plan at -50 % on the 1st month.
  const [offerSessionId, setOfferSessionId] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  // Download Stripe.js and open its connections while the paywall is read, so
  // "Continuer" only waits for the checkout session, not for Stripe to boot.
  preconnect("https://api.stripe.com");
  preconnect("https://checkout.stripe.com");
  useEffect(() => {
    if (stripePublishableKey) void getStripe(stripePublishableKey);
  }, [stripePublishableKey]);

  // Email links (?paiement=1) land straight on the payment popup.
  // The quiz's plan sheet (?payer=1) does too, for the plan it picked.
  const [modalOpen, setModalOpen] = useState(Boolean(focusPayment) || autoPay);
  // The popup is portaled to <body>: only render it once in the browser.
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);

  const autoPayTrackedRef = useRef(false);
  useEffect(() => {
    if (!autoPay || autoPayTrackedRef.current) return;
    autoPayTrackedRef.current = true;
    track("checkout_continue_clicked", { plan: selectedPlanId, source: "quiz_sheet" });
    // Once, on arrival from the sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openPaymentModal(source: "main" | "resume" | "apple_pay_badge") {
    track("checkout_continue_clicked", { plan: selectedPlanId, source });
    setError(null);
    setModalOpen(true);
  }

  // "Ce que tu débloques": one card open at a time.
  const [openFeature, setOpenFeature] = useState<number | null>(null);

  function toggleFeature(index: number) {
    if (openFeature !== index) track("checkout_feature_opened", { feature: index });
    setOpenFeature(openFeature === index ? null : index);
  }

  // Offered once per visit, when the popup of a pricier plan is closed.
  const [downsellOpen, setDownsellOpen] = useState(false);
  const downsellShownRef = useRef(false);
  // A/B test (stopped): half of the visitors closing the popup get -50 % on the 1st month.
  const [closeOfferSessionId, setCloseOfferSessionId] = useState<string | null>(null);
  const [clipperOfferOpen, setClipperOfferOpen] = useState(false);
  const closeOfferDrawnRef = useRef(false);
  // Annual exit offer (29 € instead of 49 €): shown once per visit.
  const [annualExit, setAnnualExit] = useState<{ expiresAt: Date } | null>(() =>
    previewAnnualExit ? { expiresAt: new Date(Date.now() + ANNUAL_EXIT_OFFER_WINDOW_MS) } : null
  );
  const [annualExitAccepted, setAnnualExitAccepted] = useState(false);
  const annualExitShownRef = useRef(previewAnnualExit);
  // Same as the ref, as state so the back interception can stop arming itself.
  const [annualExitAttempted, setAnnualExitAttempted] = useState(false);
  // Set only when the sheet really showed (server said 200): from then on, at
  // most the monthly downsell, never the -50 % close offer nor the clipper one.
  const annualExitSheetShownRef = useRef(previewAnnualExit);
  const modalOpenRef = useRef(modalOpen);
  useEffect(() => {
    modalOpenRef.current = modalOpen;
  });

  /** Resolves true when the sheet is now showing; the visitor is then in the `offer` group. */
  const offerAnnualExit = useCallback(
    async (trigger: "modal_close" | "back"): Promise<boolean> => {
      if (!isAnnualExitOfferEnabled() || annualExitShownRef.current || offerSessionId) return false;
      const annualPlanId = getAnnualExitOfferPlanId(selectedPlanId);
      if (!annualPlanId) return false;
      annualExitShownRef.current = true;
      setAnnualExitAttempted(true);
      const variant = getOrPickAnnualExitOfferVariant();
      registerPostHogProperties({ annual_exit_offer_variant: variant });
      track("annual_exit_offer_experiment_exposed", {
        variant,
        trigger,
        plan: selectedPlanId,
        $set: { annual_exit_offer_variant: variant },
      });
      if (variant !== "offer") return false;
      try {
        const res = await fetch("/api/checkout/annual-exit-offer", { method: "POST" });
        if (!res.ok) return false;
        const data = (await res.json()) as { expiresAt?: string };
        const expiresAt = new Date(data.expiresAt ?? "");
        if (Number.isNaN(expiresAt.getTime())) return false;
        // The visitor opened the payment popup while the answer was on its way.
        if (modalOpenRef.current) return false;
        annualExitSheetShownRef.current = true;
        setAnnualExit({ expiresAt });
        track("annual_exit_offer_shown", { trigger, plan: selectedPlanId });
        return true;
      } catch {
        return false;
      }
    },
    [selectedPlanId, offerSessionId]
  );

  /** Today's close behaviour: the -50 % close-offer test, then the monthly downsell. */
  const closeWithoutAnnualExit = useCallback((sessionId: string | null, downsellPlanId: string | undefined) => {
    if (
      isCloseOfferExperimentEnabled() &&
      !annualExitSheetShownRef.current &&
      sessionId &&
      !closeOfferDrawnRef.current
    ) {
      closeOfferDrawnRef.current = true;
      const variant = getOrPickCloseOfferVariant();
      registerPostHogProperties({ close_offer_variant: variant });
      track("close_offer_experiment_exposed", {
        close_offer_variant: variant,
        plan: selectedPlanId,
        $set: { close_offer_variant: variant },
      });
      if (variant === "offer") {
        setCloseOfferSessionId(sessionId);
        return;
      }
    }
    if (downsellPlanId && !downsellShownRef.current) {
      downsellShownRef.current = true;
      track("checkout_downsell_shown", { plan: selectedPlanId, offer_plan: downsellPlanId });
      setDownsellOpen(true);
    }
  }, [selectedPlanId]);

  const closePaymentModal = useCallback((sessionId: string | null) => {
    const entryId = getGridEntryPlanId(selectedPlanId);
    const downsellPlanId = selectedPlanId !== entryId ? entryId : undefined;
    track("checkout_modal_closed", { plan: selectedPlanId });
    requestRef.current?.abort();
    setRedirecting(false);
    setModalOpen(false);
    // The annual exit offer's popup closed: back to the normal paywall, nothing more to offer.
    if (annualExitAccepted) {
      setAnnualExitAccepted(false);
      return;
    }
    // Already discounted: nothing more to offer.
    if (offerSessionId) return;
    if (!isAnnualExitOfferEnabled()) {
      closeWithoutAnnualExit(sessionId, downsellPlanId);
      return;
    }
    // Shown: the close-offer test and the clipper offer are skipped. Not shown
    // (control group, or no offer to make): today's behaviour.
    void offerAnnualExit("modal_close").then((shown) => {
      if (!shown) closeWithoutAnnualExit(sessionId, downsellPlanId);
    });
  }, [selectedPlanId, offerSessionId, annualExitAccepted, offerAnnualExit, closeWithoutAnnualExit]);

  // Only armed while an offer can still show; when it doesn't, the hook sends
  // the visitor back so a press never gets swallowed.
  useBackInterception(
    isAnnualExitOfferEnabled() &&
      !modalOpen &&
      !focusPayment &&
      !annualExitAttempted &&
      !offerSessionId &&
      getAnnualExitOfferPlanId(selectedPlanId) !== null,
    async (): Promise<BackResult> => {
      if (await offerAnnualExit("back")) return "shown";
      // The popup opened while the offer was being fetched: stay, don't navigate.
      return modalOpenRef.current ? "aborted" : "declined";
    }
  );

  const leaveAnnualExitOffer = useCallback(() => setAnnualExitAccepted(false), []);

  const acceptAnnualExit = useCallback(() => {
    const annualPlanId = getAnnualExitOfferPlanId(selectedPlanId);
    if (!annualPlanId) return;
    track("annual_exit_offer_accepted", { plan: selectedPlanId, offer_plan: annualPlanId });
    setAnnualExit(null);
    setAnnualExitAccepted(true);
    if (annualPlanId !== selectedPlanId) onPlanChange(annualPlanId);
    setError(null);
    setModalOpen(true);
  }, [selectedPlanId, onPlanChange]);

  // Declined: only the monthly downsell, no -50 % and no clipper offer.
  // Not a useCallback: the React Compiler memoizes it, and refuses a manual one that depends on the downgrade plan.
  function dismissAnnualExit() {
    track("annual_exit_offer_dismissed", { plan: selectedPlanId });
    setAnnualExit(null);
    if (downgradePlan && !downsellShownRef.current) {
      downsellShownRef.current = true;
      track("checkout_downsell_shown", { plan: selectedPlanId, offer_plan: downgradePlan.id });
      setDownsellOpen(true);
    }
  }

  // A/B test: half of those who turn down the -50 % get the clipper programme.
  const dismissCloseOffer = useCallback(() => {
    track("close_offer_dismissed", { plan: selectedPlanId });
    setCloseOfferSessionId(null);
    const variant = getOrPickClipperOfferVariant();
    registerPostHogProperties({ clipper_offer_variant: variant });
    track("clipper_offer_experiment_exposed", {
      clipper_offer_variant: variant,
      plan: selectedPlanId,
      $set: { clipper_offer_variant: variant },
    });
    if (variant === "clipper") setClipperOfferOpen(true);
  }, [selectedPlanId]);

  const dismissClipperOffer = useCallback(() => {
    track("clipper_offer_dismissed", { plan: selectedPlanId });
    setClipperOfferOpen(false);
  }, [selectedPlanId]);

  function acceptClipperOffer() {
    track("clipper_offer_accepted", { plan: selectedPlanId });
  }

  function acceptCloseOffer() {
    track("close_offer_accepted", { plan: selectedPlanId, offer_plan: entryPlanId });
    setOfferSessionId(closeOfferSessionId);
    setCloseOfferSessionId(null);
    if (entryPlanId !== selectedPlanId) {
      onPlanChange(entryPlanId);
    }
    setModalOpen(true);
  }

  const dismissDownsell = useCallback(() => {
    track("checkout_downsell_dismissed", { plan: selectedPlanId });
    setDownsellOpen(false);
  }, [selectedPlanId]);

  function acceptDeclineOffer(sessionId: string) {
    track("checkout_decline_offer_accepted", { plan: selectedPlanId, offer_plan: entryPlanId });
    setOfferSessionId(sessionId);
    if (entryPlanId !== selectedPlanId) {
      onPlanChange(entryPlanId);
    }
  }

  function acceptDownsell() {
    if (!downgradePlan) return;
    track("checkout_downsell_accepted", { plan: selectedPlanId, offer_plan: downgradePlan.id });
    track("checkout_continue_clicked", { plan: downgradePlan.id, source: "downsell" });
    setDownsellOpen(false);
    onPlanChange(downgradePlan.id);
    setModalOpen(true);
  }

  /** Fallback from the popup: Stripe-hosted payment page for the selected plan. */
  async function goToHostedPayment() {
    if (redirecting) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const planId = selectedPlanId;

    setRedirecting(true);
    setError(null);
    track("checkout_hosted_fallback_clicked", { plan: planId });

    try {
      const data = await requestCheckoutSession("/api/checkout", planId, controller.signal, {
        annualExitOffer: annualExitAccepted || undefined,
      });
      if (!data.url) {
        throw new Error(data.error ?? copy.errStart);
      }
      track("checkout_redirected_to_stripe", { plan: planId, network_retries: data.networkRetries });
      window.location.assign(data.url);
    } catch (err) {
      if (controller.signal.aborted) return;
      // The offer is gone: the next attempt asks the normal price.
      if (err instanceof CheckoutRequestError && err.status === 409 && annualExitAccepted) {
        setAnnualExitAccepted(false);
      }
      const networkError = isNetworkError(err);
      setError(
        networkError ? copy.errNetwork : err instanceof Error ? err.message : copy.errGeneric
      );
      setRedirecting(false);
      track("checkout_error", {
        plan: planId,
        error: err instanceof Error ? err.message : String(err),
        error_type: networkError ? "network" : "server",
        checkout_variant: "hosted_fallback",
        online: navigator.onLine,
      });
    }
  }

  function selectPlan(planId: string) {
    track("checkout_plan_selected", { plan: planId, previous_plan: selectedPlanId });
    setError(null);
    setOfferSessionId(null);
    if (planId !== selectedPlanId) {
      onPlanChange(planId);
    }
  }

  useEffect(() => {
    // Back from Stripe with the browser button: the page comes out of the
    // back/forward cache still "redirecting", so unlock the button.
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) setRedirecting(false);
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      requestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    track("checkout_viewed", {
      plan: selectedPlanId,
      canceled: Boolean(canceled),
      destination_city: destination?.city,
      embedded_in_onboarding: Boolean(onBack),
      focus_payment: Boolean(focusPayment),
      recovery_offer: Boolean(recoveryOffer),
    });
    // Once per mount: plan changes are tracked by checkout_plan_selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const headline = getCheckoutHeadline(destination?.city, returning);
  // Visitors from the quiz get the plan list of the quiz's sheet as the page
  // (components/checkout/quiz-plan-page); everything below it in this file is
  // the control arm. An email link that
  // focuses the payment popup keeps the focused view.
  const quizArm = (Boolean(quiz) || fromQuiz) && !focusPayment;
  // The quiz result is read after hydration, so it gets its own event.
  useEffect(() => {
    if (!quiz) return;
    track("checkout_quiz_recommendation_shown", {
      recommended_plan: quiz.recommendedPlanId,
      plan: selectedPlanId,
    });
    // Once, when the quiz result arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz]);
  const guaranteeBoxClassName =
    "mb-4 flex items-center gap-2.5 rounded-2xl border border-pink-200 bg-pink-50 px-3 py-2.5 transition hover:bg-pink-100/70 active:bg-pink-100";
  const guaranteeBoxContent = (
    <>
      <ShieldCheck className="h-4 w-4 shrink-0 self-start mt-px text-pink-600" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm font-bold leading-tight text-zinc-900">
          {GUARANTEE.title}
          <span className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-1.5 py-px text-[10px] font-bold text-white">
            {GUARANTEE.badge}
          </span>
        </p>
        <p className="mt-1 text-[13.5px] leading-snug text-zinc-600">
          {GUARANTEE.summary}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-pink-600" />
    </>
  );

  function renderPlans(className?: string) {
    return (
    <div role="radiogroup" aria-label="Choisis ton plan" className={cn("space-y-2.5", className)}>
      {checkoutPlans.map((plan) => {
        const selected = plan.id === selectedPlanId;
        const badge = plan.popular ? copy.popularBadge : null;

        return (
          <button
            key={plan.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => selectPlan(plan.id)}
            className={cn(
              "relative flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 text-left transition",
              badge && "mt-4",
              selected
                ? "border-pink-500 ring-2 ring-pink-500/30"
                : "border-zinc-200 hover:border-zinc-300"
            )}
          >
            {badge ? (
              <span
                className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-pink-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
              >
                {badge}
              </span>
            ) : null}
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                selected ? "border-pink-500" : "border-zinc-300"
              )}
            >
              {selected && <span className="h-2.5 w-2.5 rounded-full bg-pink-500" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-semibold text-zinc-900">
                {plan.name}
                {plan.badge ? (
                  <span className="rounded-full bg-pink-100 px-1.5 py-px text-[10px] font-bold text-pink-700">
                    {plan.badge}
                  </span>
                ) : null}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block whitespace-nowrap text-lg font-bold tabular-nums text-zinc-900">
                {plan.oneTime
                  ? plan.price.replace("€", "")
                  : priceDisplay === "per_month"
                    ? getMonthlyDisplayPrice(plan)
                    : plan.perDay.replace("≈ ", "")}{" "}
                €
                <span className="text-xs font-medium text-zinc-500">
                  {plan.oneTime ? " une fois" : priceDisplay === "per_month" ? "/mois" : "/jour"}
                </span>
              </span>
              <span className="block whitespace-nowrap text-xs tabular-nums text-zinc-500">
                {plan.oneTime
                  ? "Sans abonnement"
                  : priceDisplay === "per_month" && BILLING_PERIOD_LABELS[plan.id] === "1 mois"
                    ? "Sans engagement"
                    : `${plan.price.replace("€", " €")} / ${BILLING_PERIOD_LABELS[plan.id]}`}
              </span>
              {offerEndsAt && recoveryOffer && plan.id === RECOVERY_OFFER_PLAN_ID ? (
                <span className="mt-0.5 block whitespace-nowrap text-xs font-bold tabular-nums text-pink-600">
                  {copy.focusOfferNote}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
    );
  }

  function renderContinueButton(source: "main" | "resume") {
    return (
      <button
        type="button"
        onClick={() => openPaymentModal(source)}
        className="btn-gradient flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold text-white transition hover:opacity-90 disabled:opacity-70"
      >
        {emailOfferPrice
          ? copy.continueCtaEmailOffer(emailOfferPrice.offerPrice)
          : recoveryOffer && selectedPlan.id === RECOVERY_OFFER_PLAN_ID
          ? copy.continueCtaRecoveryOffer
          : copy.continueCta(
              selectedPlan.price.replace("€", " €"),
              BILLING_PERIOD_LABELS[selectedPlan.id]
            )}
      </button>
    );
  }

  return (
    <div className="anyloc-checkout mx-auto max-w-lg px-4 sm:px-6">
      {canceled && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {copy.canceled}
        </p>
      )}

      {emailOfferPrice ? (
        <p
          data-track="checkout_email_offer_shown"
          className="mb-4 rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 text-center text-sm font-semibold text-pink-700"
        >
          {copy.emailOfferApplied(emailOfferPrice.offerPrice, emailOfferPrice.fullPrice)}
          {emailOfferTimeLeft !== null ? (
            <span className="mt-1 block text-xs font-medium text-pink-600">
              {copy.recoveryOfferEndsIn}{" "}
              <span className="font-bold tabular-nums">{formatTimeLeft(emailOfferTimeLeft)}</span>
            </span>
          ) : null}
        </p>
      ) : null}

      {offerEndsAt && recoveryOffer ? (
        <button
          type="button"
          onClick={() => selectPlan(RECOVERY_OFFER_PLAN_ID)}
          disabled={selectedPlanId === RECOVERY_OFFER_PLAN_ID}
          data-track="checkout_welcome_offer_clicked"
          className="mb-4 block w-full rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 text-center text-sm font-semibold text-pink-700 transition enabled:hover:bg-pink-100"
        >
          {selectedPlanId === RECOVERY_OFFER_PLAN_ID
            ? copy.recoveryOfferApplied
            : copy.recoveryOfferPickMonthly}
          {offerTimeLeft !== null ? (
            <span className="mt-1 block text-xs font-medium text-pink-600">
              {copy.recoveryOfferEndsIn}{" "}
              <span className="font-bold tabular-nums">{formatTimeLeft(offerTimeLeft)}</span>
            </span>
          ) : null}
        </button>
      ) : null}

      {quizArm ? (
        <QuizPlanPage
          title={{
            before: "Active ta loc",
            highlight: destination ? atCity(destination.city) : "",
            after: quiz?.mainApp ? ` sur ${quiz.mainApp}` : "",
          }}
          plans={checkoutPlans}
          selectedPlan={selectedPlan}
          referencePlan={entryPlan}
          recommendedPlanId={quiz?.recommendedPlanId}
          recommendationReason={quiz?.reason}
          worry={quiz?.worry}
          welcomeOfferPrice={
            recoveryOffer && selectedPlan.id === RECOVERY_OFFER_PLAN_ID
              ? getFirstMonthOfferPrice(selectedPlan.price)
              : undefined
          }
          hidden={autoPay && !hydrated}
          onSelectPlan={selectPlan}
          onContinue={() => openPaymentModal("main")}
        />
      ) : (
        <>
      {/* The whole box opens the conditions: visitors tapped it expecting details. */}
      <Link
        href="/politique-de-remboursement"
        target="_blank"
        rel="noreferrer"
        data-track="checkout_guarantee_conditions_clicked"
        className={guaranteeBoxClassName}
      >
        {guaranteeBoxContent}
      </Link>

      {focusPayment ? (
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            {copy.focusTitle}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            {selectedPlan.name} · {selectedPlan.price}
            {selectedPlan.period}
            {recoveryOffer && selectedPlanId === RECOVERY_OFFER_PLAN_ID
              ? ` · ${copy.focusOfferNote}`
              : ""}
          </p>
          <button
            type="button"
            onClick={onShowAllPlans}
            data-track="checkout_show_all_plans_clicked"
            className="mt-1 text-sm text-zinc-500 underline transition hover:text-zinc-900"
          >
            {copy.focusShowAllPlans}
          </button>
        </div>
      ) : (
        <>
              <h1 className="text-center text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                {headline.before} <span className="gradient-text">{headline.highlight}</span>
              </h1>
              {returning ? (
                <p className="mt-2 text-center text-sm text-zinc-600">
                  {getReturningSubline(returning)}
                </p>
              ) : null}

              {renderPlans("mt-5")}
            </>
          )}

          <div id="checkout-payment" className="mt-4 scroll-mt-20">
            {googleAuthRedirectTo ? (
              <div className="mb-4">
                <GoogleAuthLink redirectTo={googleAuthRedirectTo} />
                <AuthDivider />
              </div>
            ) : null}
            {renderContinueButton("main")}
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              {selectedPlan.oneTime ? copy.payReassuranceOneTime : copy.payReassurance}
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-zinc-600">
              <LockKeyhole className="h-3.5 w-3.5 text-pink-600" />
              {copy.paymentProcessor}
            </p>
            <ul className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-zinc-500">
              {[
                { label: "Stripe", Icon: ShieldCheck },
                { label: "Carte bancaire", Icon: CreditCard },
                { label: "Apple Pay", Icon: AppleLogo },
              ].map(({ label, Icon }) => (
                <li
                  key={label}
                  className={cn(
                    "flex items-center gap-1 rounded-md border border-zinc-200 bg-white",
                    label !== "Apple Pay" && "px-2 py-1"
                  )}
                >
                  {label === "Apple Pay" ? (
                    <button
                      type="button"
                      onClick={() => openPaymentModal("apple_pay_badge")}
                      className="flex items-center gap-1 rounded-md px-2 py-1 transition active:bg-zinc-100"
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </button>
                  ) : (
                    <>
                      <Icon className="h-3 w-3" />
                      {label}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <>
          {hydrated ? <CheckoutProofVideo /> : null}

          <h2 className="mt-10 text-base font-bold text-zinc-900">{copy.unlockTitle}</h2>
          <ul className="mt-3 space-y-2">
            {PLAN_VALUE_STACK.map((perk, index) => (
              <li key={perk}>
                <button
                  type="button"
                  onClick={() => toggleFeature(index)}
                  aria-expanded={openFeature === index}
                  className="flex w-full items-center gap-2.5 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-900 transition active:bg-zinc-50"
                >
                  <CircleCheck className="h-4 w-4 shrink-0 text-pink-600" />
                  <span className="flex-1">{perk}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-zinc-400 transition-transform",
                      openFeature === index && "rotate-180"
                    )}
                  />
                </button>
                {openFeature === index ? (
                  <p className="px-4 pt-2 pb-1 text-xs leading-relaxed text-zinc-600">
                    {PLAN_VALUE_DETAILS[index]}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <h2 className="mt-10 text-base font-bold text-zinc-900">{copy.faqTitle}</h2>
          <div className="mt-3 space-y-2">
            {copy.faq.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-zinc-900 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 leading-relaxed text-zinc-600">{item.a}</p>
              </details>
            ))}
          </div>

          <h2 className="mt-10 text-base font-bold text-zinc-900">{copy.reviewsListTitle}</h2>
          <ul className="mt-3 space-y-2">
            {CHECKOUT_REVIEWS.slice(0, 3).map((review) => (
              <li
                key={review.name}
                className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"
              >
                {review.avatar ? (
                  <Image
                    src={review.avatar}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-500 text-sm font-bold text-white"
                  >
                    {review.name.charAt(0)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-zinc-800">« {review.text} »</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
                    {review.name} · {review.city}
                    <span className="flex" aria-hidden>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Star key={i} className="h-3 w-3 fill-pink-500 text-pink-500" />
                      ))}
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {!focusPayment ? (
            // One last CTA for the plan picked at the top, so the bottom of the
            // page can pay without scrolling back up or repeating the grid.
            <div className="mt-10">{renderContinueButton("resume")}</div>
          ) : null}

        </>
        </>
      )}

      {modalOpen && hydrated ? (
        <CheckoutPaymentModal
          // A new plan or the discount needs a new Stripe session: remount the popup.
          key={`${selectedPlan.id}:${offerSessionId ?? ""}`}
          plan={selectedPlan}
          offerPlan={entryPlan}
          offerSessionId={
            offerSessionId && selectedPlan.id === entryPlanId ? offerSessionId : undefined
          }
          welcomeOffer={recoveryOffer && selectedPlan.id === RECOVERY_OFFER_PLAN_ID}
          annualExitOffer={
            annualExitAccepted && ANNUAL_EXIT_OFFERS[selectedPlan.id]
              ? { offerPrice: ANNUAL_EXIT_OFFERS[selectedPlan.id].offerPrice }
              : undefined
          }
          onAnnualExitOfferExpired={leaveAnnualExitOffer}
          onDeclineOffer={acceptDeclineOffer}
          stripePublishableKey={stripePublishableKey}
          variant={quiz ? "quiz" : undefined}
          hostedRedirecting={redirecting}
          hostedError={error}
          onHostedFallback={() => void goToHostedPayment()}
          onClose={closePaymentModal}
        />
      ) : null}

      {annualExit && hydrated ? (
        <AnnualExitOfferSheet
          fullPrice={ANNUAL_EXIT_OFFERS.annual.fullPrice}
          offerPrice={ANNUAL_EXIT_OFFERS.annual.offerPrice}
          expiresAt={annualExit.expiresAt}
          onAccept={acceptAnnualExit}
          onDismiss={dismissAnnualExit}
        />
      ) : null}

      {closeOfferSessionId && hydrated ? (
        <CheckoutDownsellSheet
          plan={selectedPlan}
          offerPlan={entryPlan}
          firstMonthPrice={getFirstMonthOfferPrice(entryPlan.price)}
          onAccept={acceptCloseOffer}
          onDismiss={dismissCloseOffer}
        />
      ) : null}

      {clipperOfferOpen && hydrated ? (
        <CheckoutClipperSheet onAccept={acceptClipperOffer} onDismiss={dismissClipperOffer} />
      ) : null}

      {downsellOpen && downgradePlan && hydrated ? (
        <CheckoutDownsellSheet
          plan={selectedPlan}
          offerPlan={downgradePlan}
          firstMonthPrice={
            recoveryOffer && downgradePlan.id === RECOVERY_OFFER_PLAN_ID
              ? getFirstMonthOfferPrice(downgradePlan.price)
              : undefined
          }
          onAccept={acceptDownsell}
          onDismiss={dismissDownsell}
        />
      ) : null}

      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          data-track="checkout_back_clicked"
          className="mt-6 w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {copy.backCta}
        </button>
      ) : null}

    </div>
  );
}
