import Link from "next/link";
import { MapPin } from "lucide-react";
import { AuthTabs } from "@/components/auth/auth-tabs";
import { Card } from "@/components/ui/card";
import { SITE } from "@/lib/constants";

export function AuthShell({
  mode,
  title,
  description,
  children,
}: {
  mode: "login" | "signup";
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

      <Card className="relative w-full max-w-md border-zinc-200/80 p-8 shadow-lg shadow-pink-500/5">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/30 to-violet-500/30">
              <MapPin className="h-4 w-4 text-pink-600" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-zinc-900">
              {SITE.name}
            </span>
          </Link>

          <Link
            href="/"
            className="text-sm text-zinc-500 transition hover:text-zinc-900"
          >
            Retour
          </Link>
        </div>

        <AuthTabs mode={mode} />

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-zinc-900">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          {description}
        </p>

        <div className="mt-8">{children}</div>
      </Card>
    </div>
  );
}
