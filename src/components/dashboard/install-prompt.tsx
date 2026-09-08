"use client";

import Link from "next/link";
import { ArrowRight, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type InstallPromptProps = {
  onMarkComplete: () => void;
};

export function InstallPrompt({ onMarkComplete }: InstallPromptProps) {
  return (
    <Card className="border-pink-200 bg-white p-6 sm:p-8">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500/10">
          <Smartphone className="h-7 w-7 text-pink-600" />
        </div>

        <h2 className="mt-5 text-2xl font-bold text-zinc-900">
          Commence par installer l&apos;app
        </h2>
        <p className="mt-3 text-sm text-zinc-600 sm:text-base">
          La carte et les spots ne servent à rien tant que l&apos;app Anyloc
          n&apos;est pas sur ton téléphone. Choisis ton système et suis le guide
          — ça prend environ 5 minutes.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/setup/ios" className="sm:flex-1 sm:max-w-[200px]">
            <Button variant="secondary" className="w-full">
              iPhone (iOS)
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/setup/android" className="sm:flex-1 sm:max-w-[200px]">
            <Button variant="secondary" className="w-full">
              Android
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <button
          type="button"
          onClick={onMarkComplete}
          className="mt-6 text-sm text-pink-600 underline-offset-4 hover:underline"
        >
          J&apos;ai déjà installé l&apos;app — passer à la carte
        </button>
      </div>
    </Card>
  );
}
