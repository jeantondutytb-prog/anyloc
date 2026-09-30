"use client";

import Link from "next/link";
import { MapPin, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import type { OnboardingDevice } from "@/components/onboarding/onboarding-device-step";
import {
  StepCta,
  StepHeader,
} from "@/components/onboarding/onboarding-step-layout";
import { CHECKOUT_CTA_LABEL, PLANS } from "@/lib/constants";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";
import {
  getUseCaseById,
  type OnboardingUseCaseId,
} from "@/lib/onboarding-use-cases";

function RecapRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 px-4 py-3.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        <div className="mt-0.5 text-sm text-zinc-900">{children}</div>
      </div>
    </div>
  );
}

export function OnboardingPlanStep({
  step,
  planId,
  device,
  apps,
  destination,
  onContinue,
  onChangeDestination,
}: {
  step: number;
  planId: string;
  device: OnboardingDevice;
  apps: OnboardingUseCaseId[];
  destination: OnboardingDestination;
  onContinue: () => void;
  onChangeDestination: () => void;
}) {
  const plan = PLANS.find((item) => item.id === planId) ?? PLANS[PLANS.length - 1];
  const isIphone = device === "iphone";

  const questions = [
    {
      q: "Mes potes peuvent voir que c'est faux ?",
      a: `Tes apps lisent la position de ton téléphone. Elles voient ${destination.city}, comme si t'y étais. Pas de VPN, pas de capture truquée.`,
    },
    {
      q: "C'est compliqué à installer ?",
      a: isIphone
        ? "Un guide pas à pas, quelques minutes, une seule fois. Sans jailbreak."
        : "Tu installes l'app directement sur ton Android, en quelques minutes.",
    },
    {
      q: "Et si je veux arrêter ?",
      a: "Un tap pour revenir à ta vraie position. Et tu résilies en 1 clic depuis ton espace.",
    },
  ];

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg">
      <StepHeader
        step={step}
        title={
          <>
            Ton plan Anyloc est <span className="gradient-text">prêt</span>
          </>
        }
        subtitle="Tout est réglé. Il ne reste qu'à débloquer ton accès."
      />

      <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <RecapRow icon={<MapPin className="h-4 w-4" />} label="Ta destination">
          <p className="font-semibold">
            {destination.emoji} {destination.city}
            {destination.area && (
              <span className="font-normal text-zinc-500"> · {destination.area}</span>
            )}
          </p>
        </RecapRow>

        <RecapRow icon={<Sparkles className="h-4 w-4" />} label="Tes apps">
          <div className="mt-1 flex flex-wrap gap-1.5">
            {apps.map(getUseCaseById).map((useCase) => (
              <span
                key={useCase.id}
                className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs font-medium"
              >
                {useCase.emoji} {useCase.label} ✓
              </span>
            ))}
          </div>
        </RecapRow>

        <RecapRow icon={<Smartphone className="h-4 w-4" />} label="Ton téléphone">
          <p className="font-semibold">{isIphone ? "iPhone" : "Android"}</p>
          <p className="text-zinc-500">
            {isIphone
              ? plan.id === "annual"
                ? "L'app iPhone est incluse dans ton plan annuel."
                : "Installation guidée. L'app iPhone est incluse avec l'annuel."
              : "Installation directe sur ton tel."}
          </p>
        </RecapRow>

        <RecapRow icon={<ShieldCheck className="h-4 w-4" />} label="Garantie 48 h">
          <p>
            Si le GPS ne change pas, on te rembourse.{" "}
            <Link
              href="/politique-de-remboursement"
              className="text-zinc-500 underline underline-offset-2 hover:text-zinc-800"
            >
              Conditions
            </Link>
          </p>
        </RecapRow>

        <div className="flex items-baseline justify-between bg-zinc-50 px-4 py-3.5">
          <p className="text-sm font-medium text-zinc-600">Plan {plan.name.toLowerCase()}</p>
          <p className="text-sm text-zinc-500">
            <span className="text-lg font-bold text-zinc-900">{plan.price}</span>
            {plan.period} · {plan.perDay} {plan.perDayLabel}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {questions.map(({ q, a }) => (
          <details
            key={q}
            className="group rounded-2xl border border-zinc-200 bg-white px-4 py-3 open:shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-zinc-900">
              {q}
              <span className="text-lg leading-none text-zinc-400 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{a}</p>
          </details>
        ))}
      </div>

      <StepCta label={CHECKOUT_CTA_LABEL} onClick={onContinue}>
        <button
          type="button"
          onClick={onChangeDestination}
          className="mt-1 w-full py-2 text-center text-sm text-zinc-500 transition-colors hover:text-zinc-800"
        >
          Changer de destination
        </button>
      </StepCta>
    </div>
  );
}
