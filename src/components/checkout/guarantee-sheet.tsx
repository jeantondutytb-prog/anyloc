"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { GUARANTEE } from "@/lib/constants";

function subscribeToNothing() {
  return () => {};
}

/**
 * The guarantee conditions over the paywall, instead of a new tab: one tap on
 * the button, the cross, the backdrop or Escape, and the visitor is back where
 * they were. Portaled to <body> so no transformed parent can trap it.
 */
export function GuaranteeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!hydrated) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-900/40 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guarantee-title"
            className="relative flex max-h-[88vh] w-full flex-col rounded-t-[28px] bg-white shadow-2xl sm:max-w-md sm:rounded-[28px]"
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            exit={{ y: 40 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            onClick={(event) => event.stopPropagation()}
          >
            <span className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-zinc-200 sm:hidden" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="absolute right-3 top-3 rounded-full p-2 text-zinc-500 hover:bg-zinc-100"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="overflow-y-auto px-5 pb-4 pt-6">
              <span className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-2 py-0.5 text-[11px] font-bold text-white">
                {GUARANTEE.badge}
              </span>
              <h2 id="guarantee-title" className="mt-3 pr-8 text-xl font-bold tracking-tight text-zinc-900">
                {GUARANTEE.title}
              </h2>
              <p className="mt-2 text-sm text-zinc-600">{GUARANTEE.summary}</p>
              <p className="mt-5 text-xs font-bold uppercase tracking-widest text-zinc-400">Les conditions</p>
              <ol className="mt-3 space-y-3">
                {GUARANTEE.conditions.map((condition, index) => (
                  <li key={condition.t} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-50 text-xs font-bold text-pink-600">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{condition.t}</p>
                      <p className="mt-0.5 text-[13px] leading-snug text-zinc-600">{condition.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <Link
                href="/politique-de-remboursement"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-block text-xs text-zinc-500 underline hover:text-zinc-900"
              >
                Lire la politique de remboursement complète
              </Link>
            </div>
            <div className="border-t border-zinc-100 px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-gradient h-12 w-full rounded-full text-[15px] font-bold text-white transition hover:opacity-90"
              >
                Revenir à mon offre
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
