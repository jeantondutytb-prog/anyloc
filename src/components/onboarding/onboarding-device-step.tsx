"use client";

import { useSyncExternalStore } from "react";
import { Check, ChevronRight } from "lucide-react";
import { StepHeader } from "@/components/onboarding/onboarding-step-layout";
import { cn } from "@/lib/utils";

export type OnboardingDevice = "iphone" | "android";

const DEVICES: {
  id: OnboardingDevice;
  label: string;
  emoji: string;
  detail: string;
}[] = [
  {
    id: "iphone",
    label: "iPhone",
    emoji: "🍎",
    detail: "Sans jailbreak. Installation guidée, une seule fois.",
  },
  {
    id: "android",
    label: "Android",
    emoji: "🤖",
    detail: "L'app s'installe directement sur ton tel.",
  },
];

const noSubscribe = () => () => {};

function detectDevice(): OnboardingDevice | null {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "iphone";
  if (/Android/.test(ua)) return "android";
  return null;
}

export function OnboardingDeviceStep({
  step,
  onSelect,
}: {
  step: number;
  onSelect: (device: OnboardingDevice) => void;
}) {
  const detected = useSyncExternalStore(noSubscribe, detectDevice, () => null);

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg">
      <StepHeader
        step={step}
        title={
          <>
            T&apos;as quel <span className="gradient-text">téléphone</span> ?
          </>
        }
        subtitle="On adapte l'installation à ton appareil."
      />

      <div className="space-y-3">
        {DEVICES.map((device) => {
          const isDetected = detected === device.id;
          return (
            <button
              key={device.id}
              type="button"
              onClick={() => onSelect(device.id)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-4 text-left shadow-sm transition-all hover:border-pink-300 hover:shadow-md",
                isDetected ? "border-pink-300 ring-2 ring-pink-100" : "border-zinc-200"
              )}
            >
              <span className="text-3xl">{device.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold text-zinc-900">
                  {device.label}
                  {isDetected && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2 py-0.5 text-[11px] font-medium text-pink-600">
                      <Check className="h-3 w-3" />
                      C&apos;est le tien
                    </span>
                  )}
                </p>
                <p className="text-sm text-zinc-500">{device.detail}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition-transform sm:group-hover:translate-x-0.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
