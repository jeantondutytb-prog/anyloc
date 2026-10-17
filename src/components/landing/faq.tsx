"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { FAQ } from "@/lib/constants";
import { track } from "@/lib/analytics/track";
import { cn } from "@/lib/utils";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" data-track-section="faq" className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            T&apos;as des questions ? Normal.
          </h2>
        </div>

        <div className="mt-10 space-y-3">
          {FAQ.map((item, i) => (
            <div
              key={item.q}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50"
            >
              <button
                type="button"
                onClick={() => {
                  if (open !== i) {
                    track("faq_opened", { question: item.q, index: i });
                  }
                  setOpen(open === i ? null : i);
                }}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-medium text-zinc-900">{item.q}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-zinc-500 transition-transform",
                    open === i && "rotate-180"
                  )}
                />
              </button>
              {open === i && (
                <div className="border-t border-zinc-200 px-5 py-4">
                  <p className="text-sm leading-relaxed text-zinc-600">
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
