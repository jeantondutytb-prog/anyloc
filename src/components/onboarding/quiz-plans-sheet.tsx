"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { QuizPlanCta, QuizPlanList } from "@/components/checkout/quiz-plan-list";
import type { Plan } from "@/lib/constants";

function subscribeToNothing() {
  return () => {};
}

const DESKTOP_QUERY = "(min-width: 640px)";

function subscribeToDesktop(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';

/** True when no other modal (the guarantee sheet, say) sits above this one. */
function isTopDialog(dialog: HTMLElement | null) {
  const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
  return dialog !== null && dialogs[dialogs.length - 1] === dialog;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Step 1 of the quiz arm's purchase: the plan picker, over the quiz's ready
 * screen. Full-height sheet on a phone, centred modal from 640 px. The cross,
 * Escape and the backdrop close it; "Continuer avec …" hands over to the
 * payment popup (/checkout?plan=…&parcours=quiz&payer=1). Portaled to <body>.
 */
export function QuizPlansSheet({
  open,
  title,
  plans,
  selectedPlan,
  referencePlan,
  recommendedPlanId,
  recommendationReason,
  onSelectPlan,
  onContinue,
  onClose,
}: {
  open: boolean;
  title: { before: string; highlight: string; after: string };
  plans: readonly Plan[];
  selectedPlan: Plan;
  referencePlan: Plan;
  recommendedPlanId?: string;
  recommendationReason?: string;
  onSelectPlan: (planId: string) => void;
  onContinue: () => void;
  onClose: () => void;
}) {
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const desktop = useSyncExternalStore(
    subscribeToDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false
  );
  const reducedMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Escape, focus trap, body scroll lock; focus goes back where it was on close.
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus({ preventScroll: true }), 0);

    function onKey(event: KeyboardEvent) {
      const dialog = dialogRef.current;
      if (!isTopDialog(dialog) || !dialog) return;
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (!dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  if (!hydrated) return null;

  // ~250 ms both ways; only a fade when the visitor asks for less motion.
  const panelMotion = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : desktop
      ? {
          initial: { opacity: 0, y: 16, scale: 0.98 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: 16, scale: 0.98 },
        }
      : { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="quiz-plans-sheet"
          className="fixed inset-0 z-[90] flex items-end justify-center bg-zinc-900/40 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quiz-plans-title"
            tabIndex={-1}
            className="relative flex h-[100dvh] w-full flex-col bg-background shadow-2xl outline-none sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-[28px]"
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
            {...panelMotion}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <div className="flex justify-end px-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 sm:px-6">
              <QuizPlanList
                title={title}
                titleId="quiz-plans-title"
                plans={plans}
                selectedPlan={selectedPlan}
                referencePlan={referencePlan}
                recommendedPlanId={recommendedPlanId}
                recommendationReason={recommendationReason}
                onSelectPlan={onSelectPlan}
              />
            </div>

            <div
              className="border-t border-zinc-100 bg-background px-4 pt-3 sm:rounded-b-[28px] sm:px-6"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
            >
              <QuizPlanCta plan={selectedPlan} onContinue={onContinue} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
