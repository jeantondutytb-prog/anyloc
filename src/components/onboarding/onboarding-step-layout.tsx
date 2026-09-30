"use client";

import type { ReactNode } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StepHeader({
  step,
  title,
  subtitle,
}: {
  step: number;
  title: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div className="mb-6 text-center sm:mb-8">
      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-pink-600">
        <Sparkles className="h-4 w-4 shrink-0" />
        Étape {step}
      </p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-sm text-zinc-500 sm:mt-3 sm:text-base">{subtitle}</p>
      )}
    </div>
  );
}

/** Pinned to the bottom of the screen on mobile, inline on larger screens. */
export function StepCta({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <>
      <div className="h-36 sm:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-background via-background to-background/0 px-4 pb-4 pt-8 sm:static sm:mt-8 sm:bg-none sm:p-0">
        <div className="mx-auto max-w-lg">
          <Button className="h-14 w-full text-base" onClick={onClick} disabled={disabled}>
            {label}
            <ArrowRight className="h-5 w-5" />
          </Button>
          {children}
        </div>
      </div>
    </>
  );
}
