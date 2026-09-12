"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Download, Loader2, Smartphone, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";

type TrialStatus =
  | "idle"
  | "starting"
  | "waiting-install"
  | "active"
  | "expired"
  | "error";

function useCountdown(targetIso: string | null) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!targetIso) {
      setRemaining(0);
      return;
    }

    const target = new Date(targetIso).getTime();

    function tick() {
      setRemaining(Math.max(0, Math.round((target - Date.now()) / 1000)));
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  return remaining;
}

export function OnboardingAndroidTrial({
  destination,
}: {
  destination: OnboardingDestination;
}) {
  const [status, setStatus] = useState<TrialStatus>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [trialExpiresAt, setTrialExpiresAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remaining = useCountdown(trialExpiresAt);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  useEffect(() => {
    if (status === "waiting-install" && trialExpiresAt && remaining === 0) {
      setStatus("expired");
      stopPolling();
    }
  }, [status, remaining, trialExpiresAt, stopPolling]);

  const startTrial = async () => {
    setStatus("starting");
    setErrorMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const { error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) {
          throw new Error("Impossible de démarrer une session. Réessaie.");
        }
      }

      const response = await fetch("/api/device/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "android" }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Impossible de démarrer l'essai.");
      }

      setToken(data.token);
      setTrialExpiresAt(data.trialExpiresAt);
      setStatus("waiting-install");

      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch("/api/device/location", {
            headers: { Authorization: `Bearer ${data.token}` },
          });
          if (!res.ok) return;
          const locationData = await res.json();
          if (locationData.location?.isActive) {
            setStatus("active");
            stopPolling();
          }
        } catch {
          // ignore transient poll errors
        }
      }, 3000);
    } catch (startError) {
      setErrorMessage(
        startError instanceof Error ? startError.message : "Une erreur est survenue."
      );
      setStatus("error");
    }
  };

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-xl">
      <div className="flex items-center justify-between bg-gradient-to-r from-pink-500 to-violet-500 px-5 py-3 text-white/90">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          <span className="text-xs font-medium">Essai Android — 5 min gratuites</span>
        </div>
        {status === "waiting-install" && (
          <span className="flex items-center gap-1 text-xs font-medium">
            <Clock className="h-3.5 w-3.5" />
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
        )}
      </div>

      <div className="p-5 sm:p-6">
        {status === "idle" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-zinc-600">
              Installe l&apos;app sur ton Android et vois ta position basculer
              à {destination.city} en direct — pas une simulation.
            </p>
            <Button className="w-full" onClick={() => void startTrial()}>
              <Zap className="h-4 w-4" />
              Lancer l&apos;essai gratuit
            </Button>
          </div>
        )}

        {status === "starting" && (
          <div className="flex flex-col items-center gap-3 py-4 text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-sm">Préparation de ton essai…</p>
          </div>
        )}

        {status === "waiting-install" && token && (
          <div className="flex flex-col gap-3">
            <a href="/api/downloads/apk">
              <Button className="w-full" variant="secondary">
                <Download className="h-4 w-4" />
                Télécharger l&apos;APK
              </Button>
            </a>
            <div className="rounded-xl border border-pink-200 bg-pink-50/70 p-3">
              <p className="text-xs font-medium text-pink-700">
                1. Installe l&apos;APK sur ton Android
              </p>
              <p className="mt-1 text-xs text-pink-600/90">
                2. Ouvre Anyloc, colle ce code, choisis {destination.city}
              </p>
              <code className="mt-2 block break-all rounded-lg bg-white px-3 py-2 text-xs text-zinc-800">
                {token}
              </code>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-xl bg-zinc-50 p-2.5 text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <p className="text-xs">En attente de ta position…</p>
            </div>
          </div>
        )}

        {status === "active" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-2 py-2 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-2xl">
              {destination.emoji}
            </div>
            <p className="font-semibold text-zinc-900">
              Ta position est active à {destination.city} !
            </p>
            <div className="mt-1 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-medium text-emerald-700">
                Signal GPS confirmé sur ton tel
              </p>
            </div>
          </motion.div>
        )}

        {status === "expired" && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <p className="text-sm text-zinc-600">
              Ton essai gratuit est terminé. Active ton abonnement pour garder
              ta position en continu.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <p className="text-sm text-red-600">{errorMessage}</p>
            <Button variant="secondary" onClick={() => void startTrial()}>
              Réessayer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
