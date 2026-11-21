"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { track } from "@/lib/analytics/track";
import {
  ACQUISITION_OTHER,
  ACQUISITION_STORAGE_KEY,
  shuffleAccounts,
  type AcquisitionAccount,
} from "@/lib/acquisition-source";

function alreadyAsked() {
  try {
    return window.localStorage.getItem(ACQUISITION_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

function remember(value: string) {
  try {
    window.localStorage.setItem(ACQUISITION_STORAGE_KEY, value);
  } catch {}
}

/**
 * One tap under "Paiement confirmé": which TikTok account brought the customer.
 * Only mounted on the client once the payment is confirmed, so reading
 * localStorage on the first render is safe. Skippable, never shown twice.
 */
export function AcquisitionSourceQuestion({ preview = false }: { preview?: boolean }) {
  const [state, setState] = useState<"asking" | "thanks" | "hidden">(() =>
    alreadyAsked() ? "hidden" : "asking"
  );
  const [accounts] = useState(() => shuffleAccounts());

  if (state === "hidden") return null;

  if (state === "thanks") {
    return (
      <p className="mb-6 flex items-center justify-center gap-2 text-sm text-zinc-500">
        <Check className="h-4 w-4 text-pink-500" />
        Merci, ça nous aide beaucoup !
      </p>
    );
  }

  function answer(account: AcquisitionAccount) {
    if (!preview) {
      track("acquisition_source_answered", { account, source: "payment_success" });
    }
    remember(account);
    setState("thanks");
  }

  function skip() {
    if (!preview) {
      track("acquisition_source_skipped", { source: "payment_success" });
    }
    remember("skipped");
    setState("hidden");
  }

  return (
    <section
      aria-labelledby="acquisition-source-title"
      className="mb-6 rounded-2xl border border-zinc-200 bg-white px-4 py-4"
    >
      <p id="acquisition-source-title" className="font-semibold text-zinc-900">
        Sur quel compte TikTok tu nous as vus ?
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {accounts.map((account) => (
          <button
            key={account}
            type="button"
            onClick={() => answer(account)}
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-800 transition-colors hover:border-pink-300 hover:bg-pink-50"
          >
            @{account}
          </button>
        ))}
        <button
          type="button"
          onClick={() => answer(ACQUISITION_OTHER)}
          className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-800 transition-colors hover:border-pink-300 hover:bg-pink-50"
        >
          Autre / pas TikTok
        </button>
      </div>
      <button
        type="button"
        onClick={skip}
        className="mt-3 text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-700"
      >
        Passer
      </button>
    </section>
  );
}
