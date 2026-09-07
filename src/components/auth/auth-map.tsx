"use client";

import dynamic from "next/dynamic";

const AuthMapScene = dynamic(
  () =>
    import("@/components/auth/auth-map-scene").then(
      (module) => module.AuthMapScene
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[340px] w-full max-w-[420px] animate-pulse rounded-2xl border border-white/10 bg-zinc-900/80" />
    ),
  }
);

export function AuthMap() {
  return <AuthMapScene />;
}
