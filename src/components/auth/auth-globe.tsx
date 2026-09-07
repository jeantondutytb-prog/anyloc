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
      <div className="flex h-[360px] w-[360px] items-center justify-center">
        <div className="h-48 w-48 animate-pulse rounded-full bg-white/5" />
      </div>
    ),
  }
);

export function AuthGlobe() {
  return <AuthGlobeScene />;
}
