import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-pink-500/10 blur-[120px]" />
        <div className="absolute top-0 right-0 h-[280px] w-[360px] rounded-full bg-violet-500/10 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[220px] w-[320px] rounded-full bg-orange-500/8 blur-[100px]" />
      </div>

      <Card className="relative w-full max-w-md overflow-hidden border-zinc-200/80 p-0 shadow-lg shadow-pink-500/5">
        <div className="flex items-center justify-between gap-4 bg-logo-background px-8 py-6">
          <Logo />

          <Link
            href="/"
            className="text-sm text-zinc-500 transition hover:text-zinc-900"
          >
            Retour
          </Link>
        </div>

        <div className="p-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            {description}
          </p>

          <div className="mt-8">{children}</div>
        </div>
      </Card>
    </div>
  );
}
