"use client";

import dynamic from "next/dynamic";

const AuthGlobeScene = dynamic(
  () =>
    import("@/components/auth/auth-globe-scene").then(
      (module) => module.AuthGlobeScene
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] w-[400px] shrink-0 items-center justify-center">
        <div className="h-52 w-52 animate-pulse rounded-full bg-slate-700/40 shadow-[inset_-12px_-12px_30px_rgba(0,0,0,0.5)]" />
      </div>
    ),
  }
);

export function AuthGlobe() {
  return <AuthGlobeScene />;
}
