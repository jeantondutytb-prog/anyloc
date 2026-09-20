"use client";

import { useState } from "react";
import { MonitorSmartphone } from "lucide-react";
import {
  ANDROID_INSTALL_NOTE,
  detectUserPlatform,
  IOS_INSTALL_CONSTRAINT,
  type UserPlatform,
} from "@/lib/platform";
import { cn } from "@/lib/utils";

export function PlatformConstraintNotice({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [platform, setPlatform] = useState<UserPlatform>(() =>
    typeof window === "undefined"
      ? "unknown"
      : detectUserPlatform(window.navigator.userAgent)
  );

  const resolvedPlatform = platform === "unknown" ? "ios" : platform;
  const isIos = resolvedPlatform === "ios";

  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-200 bg-amber-50/90 p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <MonitorSmartphone className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-950">
            Avant de payer, vérifie ton appareil
          </p>

          <div className="mt-3 inline-flex rounded-full border border-amber-200 bg-white p-1">
            {(["ios", "android"] as const).map((option) => {
              const selected = resolvedPlatform === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPlatform(option)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    selected
                      ? "bg-amber-700 text-white"
                      : "text-amber-900 hover:bg-amber-100"
                  )}
                >
                  {option === "ios" ? "iPhone" : "Android"}
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-sm leading-relaxed text-amber-950/90">
            {isIos ? IOS_INSTALL_CONSTRAINT : ANDROID_INSTALL_NOTE}
          </p>

          {!compact && isIos ? (
            <p className="mt-2 text-xs text-amber-800/80">
              Si tu n&apos;as pas accès à un ordinateur, Anyloc ne sera pas adapté à ton
              usage iPhone.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
