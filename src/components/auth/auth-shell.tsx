import Link from "next/link";
import { MapPin } from "lucide-react";
import { AuthTabs } from "@/components/auth/auth-tabs";
import { AuthVisualPanel } from "@/components/auth/auth-visual-panel";
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
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <AuthVisualPanel mode={mode} />

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
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

          <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-sm lg:border-none lg:bg-transparent lg:p-0 lg:shadow-none">
            <div className="hidden items-center justify-between lg:flex">
              <Link
                href="/"
                className="text-sm text-zinc-500 transition hover:text-zinc-900"
              >
                ← Retour au site
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
          </div>
        </div>
      </div>
    </div>
  );
}
