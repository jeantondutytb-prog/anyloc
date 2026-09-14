"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CHECKOUT_PROOF_SLIDES } from "@/lib/checkout-copy";
import { cn } from "@/lib/utils";

function ProofPhone({
  label,
  src,
  variant,
}: {
  label: string;
  src: string;
  variant: "snap" | "system";
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <span
        className={cn(
          "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
          variant === "snap"
            ? "bg-pink-500/10 text-pink-600"
            : "bg-violet-500/10 text-violet-700"
        )}
      >
        {label}
      </span>
      <div className="w-full max-w-[148px] overflow-hidden rounded-[1.75rem] border-[3px] border-zinc-900 bg-zinc-900 shadow-lg shadow-pink-500/10 sm:max-w-[168px]">
        <img
          src={src}
          alt={label}
          className="aspect-[9/19.5] w-full object-cover object-top"
          loading="lazy"
          draggable={false}
        />
      </div>
    </div>
  );
}

export function CheckoutProofCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateActiveIndex = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;

    const slides = Array.from(node.children) as HTMLElement[];
    if (slides.length === 0) return;

    const center = node.scrollLeft + node.clientWidth / 2;
    let closest = 0;
    let minDistance = Number.POSITIVE_INFINITY;

    slides.forEach((slide, index) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const distance = Math.abs(center - slideCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closest = index;
      }
    });

    setActiveIndex(closest);
  }, []);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;

    updateActiveIndex();
    node.addEventListener("scroll", updateActiveIndex, { passive: true });
    return () => node.removeEventListener("scroll", updateActiveIndex);
  }, [updateActiveIndex]);

  function scrollToIndex(index: number) {
    const node = scrollerRef.current;
    if (!node) return;

    const slide = node.children[index] as HTMLElement | undefined;
    if (!slide) return;

    node.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
  }

  function shift(direction: -1 | 1) {
    const next =
      (activeIndex + direction + CHECKOUT_PROOF_SLIDES.length) %
      CHECKOUT_PROOF_SLIDES.length;
    scrollToIndex(next);
  }

  return (
    <div className="relative mx-auto max-w-lg">
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {CHECKOUT_PROOF_SLIDES.map((slide) => (
          <div
            key={slide.id}
            className="w-full shrink-0 snap-center px-2"
          >
            <div className="flex items-end justify-center gap-4 sm:gap-6">
              <ProofPhone
                label={slide.snap.label}
                src={slide.snap.src}
                variant="snap"
              />
              <ProofPhone
                label={slide.system.label}
                src={slide.system.src}
                variant="system"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:border-pink-300 hover:text-pink-600"
          aria-label="Preuve précédente"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex gap-1.5">
          {CHECKOUT_PROOF_SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => scrollToIndex(index)}
              aria-label={`Voir la preuve ${index + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === activeIndex
                  ? "w-6 bg-pink-500"
                  : "w-1.5 bg-zinc-300 hover:bg-zinc-400"
              )}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => shift(1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:border-pink-300 hover:text-pink-600"
          aria-label="Preuve suivante"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-zinc-500">
        Swipe ou utilise les flèches pour voir d&apos;autres exemples
      </p>
    </div>
  );
}
