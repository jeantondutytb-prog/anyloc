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
      <div className="flex h-[min(42vw,380px)] w-[min(42vw,380px)] items-center justify-center">
        <div className="h-44 w-44 animate-pulse rounded-full bg-indigo-500/10" />
      </div>
    ),
  }
);

export function AuthGlobe() {
  return <AuthGlobeScene />;
}
