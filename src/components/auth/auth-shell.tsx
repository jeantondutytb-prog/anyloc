import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";

export function AuthShell({
  title,
  description,
  notice,
  children,
}: {
  title: string;
  description: string;
  /** Shown above the title, e.g. the destination picked during onboarding. */
  notice?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // Dark like the app (apps/ios/Anyloc/Theme.swift): signup/login continue
    // the onboarding sandbox instead of switching back to the light site.
    <div className="app-dark relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#0A0A0C] px-4 py-12 [color-scheme:dark]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-pink-500/[0.12] blur-[120px]" />
        <div className="absolute top-0 right-0 h-[280px] w-[360px] rounded-full bg-violet-500/[0.12] blur-[100px]" />
      </div>

      <Card className="animate-auth-enter relative w-full max-w-md overflow-hidden rounded-[28px] border-[#25252B] bg-[#0C0C0E] p-0 shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between gap-4 border-b border-[#25252B] px-8 py-5 text-[#F4F4F5]">
          <Logo />

          <Link
            href="/"
            className="text-sm text-[#8B8B94] transition hover:text-[#F4F4F5]"
          >
            Retour
          </Link>
        </div>

        <div className="p-8">
          {notice}
          <h1 className="text-2xl font-bold tracking-tight text-[#F4F4F5]">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#8B8B94]">
            {description}
          </p>

          <div className="mt-8">{children}</div>
        </div>
      </Card>
    </div>
  );
}
