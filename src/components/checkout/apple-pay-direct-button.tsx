"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckoutElementsProvider,
  ExpressCheckoutElement,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import type {
  StripeCheckoutExpressCheckoutElementOptions,
  StripeExpressCheckoutElementConfirmEvent,
} from "@stripe/stripe-js";
import { track } from "@/lib/analytics/track";
import { CHECKOUT_COPY } from "@/lib/checkout-copy";
import { isNetworkError, requestCheckoutSession } from "@/lib/checkout-request";
import { getStripe } from "@/lib/stripe-browser";

/** How long Stripe gets to say whether Apple Pay is available before the paywall gives up on it. */
const READY_TIMEOUT_MS = 3000;

// Same height and pill shape as the gradient button it replaces.
const BUTTON_HEIGHT = 48;

/** Apple Pay only: the paywall never offers Google Pay, Link or PayPal here. */
const EXPRESS_OPTIONS: StripeCheckoutExpressCheckoutElementOptions = {
  buttonHeight: BUTTON_HEIGHT,
  buttonTheme: { applePay: "black" },
  buttonType: { applePay: "subscribe" },
  layout: { maxColumns: 1, maxRows: 1, overflow: "never" },
  paymentMethodOrder: ["apple_pay"],
  paymentMethods: {
    applePay: "auto",
    googlePay: "never",
    link: "never",
    paypal: "never",
    amazonPay: "never",
    klarna: "never",
  },
};

const ELEMENTS_OPTIONS = {
  appearance: { variables: { borderRadius: `${BUTTON_HEIGHT / 2}px` } },
} as const;

export type ApplePayDirectStatus = "pending" | "available" | "unavailable";

/**
 * Pays from the button once Face ID is done: confirms the checkout session
 * and sends the buyer to the same completion page as the payment popup.
 */
function ApplePayButton({
  planId,
  sessionId,
  onReady,
  onFailed,
}: {
  planId: string;
  sessionId: string;
  onReady: (applePayAvailable: boolean) => void;
  onFailed: () => void;
}) {
  const result = useCheckoutElements();
  const checkout = result.type === "success" ? result.checkout : null;
  // Stripe ignores prop changes after mount: the handlers read the latest values.
  const latestRef = useRef({ checkout, planId, sessionId });
  useEffect(() => {
    latestRef.current = { checkout, planId, sessionId };
  }, [checkout, planId, sessionId]);

  useEffect(() => {
    if (result.type === "error") onFailed();
  }, [result.type, onFailed]);

  async function handleConfirm(event: StripeExpressCheckoutElementConfirmEvent) {
    const { checkout: current, planId: plan, sessionId: session } = latestRef.current;
    if (!current) {
      event.paymentFailed({ reason: "fail" });
      return;
    }

    track("checkout_pay_submitted", { plan, payment_method: "apple_pay", source: "apple_pay_direct" });
    const confirmed = await current.confirm({
      expressCheckoutConfirmEvent: event,
      redirect: "if_required",
    });

    if (confirmed.type === "error") {
      track("checkout_payment_failed", {
        plan,
        source: "apple_pay_direct",
        error_code: confirmed.error.code,
      });
      event.paymentFailed({ reason: "fail", message: confirmed.error.message });
      return;
    }

    // The webhook activates the subscription; this page signs the buyer in and lands them in the app.
    const complete = new URL("/auth/checkout-complete", window.location.origin);
    complete.searchParams.set("session_id", session);
    window.location.assign(complete);
  }

  if (!checkout) return null;

  return (
    <ExpressCheckoutElement
      options={EXPRESS_OPTIONS}
      onReady={(event) => onReady(Boolean(event.availablePaymentMethods?.applePay))}
      onLoadError={onFailed}
      // The checkout flavor of the element has no click event: the button takes
      // focus when it is tapped, which is the closest signal.
      onFocus={() => track("checkout_apple_pay_direct_clicked", { plan: planId })}
      onConfirm={handleConfirm}
    />
  );
}

/**
 * Native Apple Pay button of the paywall (A/B test "apple_pay_direct"). Stripe's
 * Express Checkout Element needs a checkout session up front, so one is created
 * for the selected plan and replaced when the plan changes: the Apple Pay sheet
 * always charges the plan on screen. Reports whether Apple Pay is usable so the
 * paywall can fall back to its usual button.
 */
export function ApplePayDirectButton({
  planId,
  stripePublishableKey,
  onStatusChange,
}: {
  planId: string;
  stripePublishableKey: string;
  onStatusChange: (status: ApplePayDirectStatus) => void;
}) {
  const [session, setSession] = useState<{
    planId: string;
    clientSecret: string;
    sessionId: string;
  } | null>(null);
  // The button of a plan other than the selected one must never be tappable.
  const current = session?.planId === planId ? session : null;
  const [ready, setReady] = useState(false);
  // A later session that can't be created leaves the "Continuer" button below.
  const [failed, setFailed] = useState(false);
  const onStatusRef = useRef(onStatusChange);
  useEffect(() => {
    onStatusRef.current = onStatusChange;
  }, [onStatusChange]);
  const decidedRef = useRef(false);

  const stripePromise = useMemo(() => getStripe(stripePublishableKey), [stripePublishableKey]);

  // The first answer is the one the paywall acts on: it doesn't flip back and forth.
  function decide(status: "available" | "unavailable") {
    if (decidedRef.current) return;
    decidedRef.current = true;
    track("checkout_apple_pay_direct_shown", { plan: planId, available: status === "available" });
    onStatusRef.current(status);
  }

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a new plan hides the previous plan's button until its session is ready
    setReady(false);
    setFailed(false);

    requestCheckoutSession(
      "/api/stripe/express-checkout",
      planId,
      controller.signal,
      undefined,
      "apple_pay_direct"
    )
      .then((data) => {
        if (!data.clientSecret || !data.sessionId) {
          throw new Error(data.error ?? CHECKOUT_COPY.errStart);
        }
        setSession({ planId, clientSecret: data.clientSecret, sessionId: data.sessionId });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        track("checkout_apple_pay_direct_error", {
          plan: planId,
          error: err instanceof Error ? err.message : String(err),
          error_type: isNetworkError(err) ? "network" : "server",
        });
        setFailed(true);
        decide("unavailable");
      });

    return () => controller.abort();
    // `decide` only reads refs and `planId` for the event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  // Stripe never answers on browsers without Apple Pay support: don't wait for it.
  useEffect(() => {
    if (!current || decidedRef.current) return;
    const timer = setTimeout(() => decide("unavailable"), READY_TIMEOUT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.clientSecret]);

  const options = useMemo(
    () =>
      current
        ? { clientSecret: current.clientSecret, elementsOptions: ELEMENTS_OPTIONS }
        : null,
    [current]
  );

  return (
    <div className="relative" style={{ minHeight: BUTTON_HEIGHT }}>
      {current && options ? (
        <div className={ready ? undefined : "opacity-0"}>
          <CheckoutElementsProvider key={current.clientSecret} stripe={stripePromise} options={options}>
            <ApplePayButton
              planId={current.planId}
              sessionId={current.sessionId}
              onReady={(applePayAvailable) => {
                decide(applePayAvailable ? "available" : "unavailable");
                setReady(applePayAvailable);
              }}
              onFailed={() => decide("unavailable")}
            />
          </CheckoutElementsProvider>
        </div>
      ) : null}
      {!ready && !failed ? (
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse rounded-full bg-zinc-900/90"
        />
      ) : null}
    </div>
  );
}
