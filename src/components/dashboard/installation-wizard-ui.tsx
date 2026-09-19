"use client";

import type { LucideIcon } from "lucide-react";
import { Check, ChevronLeft, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const WIZARD_TOTAL_STEPS = 5;

export function WizardShell({
  step,
  total = WIZARD_TOTAL_STEPS,
  icon: Icon,
  iconPulse = false,
  title,
  subtitle,
  children,
  footer,
  onBack,
  stepLabel,
}: {
  step: number;
  total?: number;
  icon: LucideIcon;
  iconPulse?: boolean;
  title: string;
  subtitle: ReactNode;
  children?: ReactNode;
  footer: ReactNode;
  onBack?: () => void;
  stepLabel?: string;
}) {
  return (
    <div className="wizard-step mx-auto w-full max-w-[520px]">
      <div className="h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-pink-500 transition-all duration-400"
          style={{ width: `${Math.max((step / total) * 100, 8)}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-zinc-500">
          {stepLabel ?? `Étape ${step} / ${total}`}
        </p>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition hover:text-zinc-300"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Retour
          </button>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-8 flex h-20 w-20 items-center justify-center rounded-[20px] bg-pink-500/10",
          iconPulse && "wizard-icon-pulse"
        )}
      >
        <Icon className="h-10 w-10 text-pink-500" strokeWidth={1.5} />
      </div>

      <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-white">
        {title}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">
        {subtitle}
      </p>

      {children ? <div className="mt-7">{children}</div> : null}
      <div className={cn(children ? "mt-8" : "mt-8", "space-y-2")}>{footer}</div>
    </div>
  );
}

export const wizardPrimaryClassName =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-pink-500 px-4 py-3.5 text-[15px] font-bold text-white transition hover:bg-pink-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export const wizardSecondaryClassName =
  "flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[13px] font-semibold text-zinc-400 transition hover:bg-white/10 hover:text-white";

export function WizardPrimaryButton({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={wizardPrimaryClassName}
    >
      {children}
    </button>
  );
}

export function WizardSecondaryButton({
  children,
  onClick,
  hidden,
}: {
  children: ReactNode;
  onClick?: () => void;
  hidden?: boolean;
}) {
  if (hidden) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={wizardSecondaryClassName}
    >
      {children}
    </button>
  );
}

export function WizardSkipButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full py-3 text-center text-[13px] text-zinc-500 transition hover:text-zinc-400 hover:underline"
    >
      {children}
    </button>
  );
}

export function WizardChecklist({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-center gap-2.5 py-1 text-sm text-zinc-300"
          >
            <Check className="h-4 w-4 shrink-0 text-pink-500" strokeWidth={3} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WizardInstruction({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-3 flex gap-3.5 rounded-xl border border-white/10 bg-white/5 p-4 last:mb-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-pink-500/15 text-sm font-bold text-pink-400">
        {number}
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <div className="mt-1 text-[13px] leading-relaxed text-zinc-400">
          {children}
        </div>
      </div>
    </div>
  );
}

export function WizardStatusBox({
  variant = "idle",
  title,
  hint,
}: {
  variant?: "idle" | "searching" | "ok" | "error";
  title: string;
  hint?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3.5",
        variant === "ok" && "border-emerald-500/30 bg-emerald-500/10",
        variant === "error" && "border-red-500/30 bg-red-500/10",
        (variant === "idle" || variant === "searching") &&
          "border-white/10 bg-white/5"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
          variant === "ok" && "bg-emerald-500/15 text-emerald-400",
          variant === "error" && "bg-red-500/15 text-red-400",
          (variant === "idle" || variant === "searching") &&
            "bg-white/5 text-zinc-500"
        )}
      >
        {variant === "searching" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : variant === "ok" ? (
          <Check className="h-5 w-5" strokeWidth={2.5} />
        ) : (
          <Loader2 className="h-5 w-5" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        {hint ? (
          <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

export function WizardTip({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-pink-500/20 bg-pink-500/10 px-4 py-3.5 text-[13px] leading-relaxed text-zinc-300">
      {children}
    </div>
  );
}

export function WizardSuccessCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
        <Check className="h-8 w-8" strokeWidth={2.5} />
      </div>
      <h3 className="text-xl font-extrabold text-white">{title}</h3>
      <div className="mt-3 text-sm leading-relaxed text-zinc-400">{children}</div>
    </div>
  );
}
