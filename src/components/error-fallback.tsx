"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export function ErrorFallback({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Logo />
      <h1 className="mt-8 text-2xl font-bold tracking-tight text-zinc-900">
        Oups, un truc a planté
      </h1>
      <p className="mt-2 max-w-md text-center text-sm leading-relaxed text-zinc-500">
        Réessaie, ou reviens à l&apos;accueil. Si ça continue, écris-nous à
        support@anyloc.io.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          Réessayer
        </Button>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 text-sm font-medium text-zinc-900 shadow-sm transition hover:border-pink-300 hover:bg-zinc-50"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
