import Link from "next/link";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SITE } from "@/lib/constants";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-pink-500/10 blur-[120px]" />
        <div className="absolute top-0 right-0 h-[280px] w-[360px] rounded-full bg-violet-500/10 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[220px] w-[320px] rounded-full bg-orange-500/8 blur-[100px]" />
      </div>

      <Card className="relative w-full max-w-md border-zinc-200/80 p-8 shadow-lg shadow-pink-500/5">
        <Link href="/" className="mx-auto flex w-fit items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/30 to-violet-500/30">
            <MapPin className="h-4 w-4 text-pink-600" />
          </div>
          <span className="text-lg font-semibold tracking-tight">{SITE.name}</span>
        </Link>

        <h1 className="mt-8 text-center text-2xl font-bold text-zinc-900">
          {title}
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-500">{description}</p>

        <div className="mt-8">{children}</div>

        {footer ? <div className="mt-6">{footer}</div> : null}
      </Card>
    </div>
  );
}
