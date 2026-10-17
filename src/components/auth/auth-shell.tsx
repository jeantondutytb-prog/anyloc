import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-background px-2 pt-2 pb-12 sm:px-4 sm:pt-3">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-pink-500/10 blur-[120px]" />
        <div className="absolute top-0 right-0 h-[280px] w-[360px] rounded-full bg-violet-500/10 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[220px] w-[320px] rounded-full bg-violet-500/8 blur-[100px]" />
      </div>

      {/* Same floating pill as the landing header. */}
      <div className="animate-auth-enter relative flex h-14 w-full max-w-md items-center justify-between rounded-full border border-zinc-200/80 bg-white/85 pr-2 pl-3 shadow-lg shadow-zinc-900/5 backdrop-blur-md sm:pl-4">
        <Logo />
        <Link
          href="/"
          className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
      </div>

      <div className="relative flex w-full flex-1 items-center justify-center px-2 pt-8 sm:px-0 sm:pt-12">
        <Card className="animate-auth-enter w-full max-w-md border-zinc-200/80 p-6 shadow-lg shadow-pink-500/5 [animation-delay:80ms] sm:p-8">
          {notice}
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            {description}
          </p>

          <div className="mt-8">{children}</div>
        </Card>
      </div>
    </div>
  );
}
