"use client";

import Image from "next/image";
import {
  StepCta,
  StepHeader,
} from "@/components/onboarding/onboarding-step-layout";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";
import {
  getUseCaseById,
  type OnboardingUseCaseId,
} from "@/lib/onboarding-use-cases";

// Real captures taken with Anyloc (public/proof). Cities without their own
// capture fall back to Dubai, labelled as an example so nothing is misrepresented.
const PROOFS: Record<
  string,
  { src: string; app: string; useCaseId: OnboardingUseCaseId | null }
> = {
  dubai: { src: "/proof/snap-dubai.png", app: "Snap Map", useCaseId: "snap" },
  miami: { src: "/proof/snap-miami.png", app: "Snap Map", useCaseId: "snap" },
  "new york": { src: "/proof/snap-new-york.png", app: "Snap Map", useCaseId: "snap" },
  paris: { src: "/proof/sys-paris.png", app: "Plans", useCaseId: null },
  rio: { src: "/proof/sys-rio.png", app: "Plans", useCaseId: null },
  tokyo: { src: "/proof/sys-tokyo.png", app: "Plans", useCaseId: null },
};

function findProof(city: string) {
  const key = city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const match = Object.keys(PROOFS).find((name) => key.startsWith(name));
  return match
    ? { ...PROOFS[match], isExample: false, takenIn: city }
    : { ...PROOFS.dubai, isExample: true, takenIn: "Dubai" };
}

export function OnboardingProofStep({
  step,
  destination,
  apps,
  onContinue,
}: {
  step: number;
  destination: OnboardingDestination;
  apps: OnboardingUseCaseId[];
  onContinue: () => void;
}) {
  const proof = findProof(destination.city);
  const otherApps = apps
    .filter((id) => id !== proof.useCaseId)
    .map((id) => getUseCaseById(id).appName);

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg">
      <StepHeader
        step={step}
        title={
          proof.isExample ? (
            <>
              Ce que tes potes <span className="gradient-text">verront</span>
            </>
          ) : (
            <>
              Ce que tes potes <span className="gradient-text">voient</span>
            </>
          )
        }
        subtitle={
          proof.isExample
            ? `Une vraie capture prise à Dubai avec Anyloc. À ${destination.city}, ce sera pareil.`
            : `Une vraie capture ${proof.app} à ${destination.city}, prise avec Anyloc. Pas un montage.`
        }
      />

      <div className="relative mx-auto w-[240px] rounded-[40px] bg-zinc-900 p-[6px] shadow-2xl shadow-pink-500/20 ring-1 ring-zinc-700 sm:w-[260px]">
        <div className="relative aspect-[924/2000] overflow-hidden rounded-[34px] bg-zinc-100">
          <Image
            src={proof.src}
            alt={`Capture ${proof.app} à ${proof.takenIn} avec Anyloc`}
            fill
            sizes="260px"
            className="object-cover"
            priority
          />
        </div>
        <span className="absolute -right-3 top-1/2 rotate-6 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-lg">
          Vraie capture ✓
        </span>
      </div>

      {otherApps.length > 0 && (
        <p className="mt-6 text-center text-sm text-zinc-600">
          Et c&apos;est la même position sur{" "}
          <span className="font-semibold text-zinc-900">{otherApps.join(", ")}</span> :
          Anyloc change le GPS de tout ton téléphone.
        </p>
      )}

      <StepCta label="Voir mon plan" onClick={onContinue} />
    </div>
  );
}
