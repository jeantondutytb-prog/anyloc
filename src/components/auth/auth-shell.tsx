import Link from "next/link";
import { MapPin } from "lucide-react";
import { AuthMarketingPanel } from "@/components/auth/auth-marketing-panel";
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
    <div className="flex min-h-screen bg-[#fff9fb]">
      <AuthMarketingPanel />

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-lg font-extrabold tracking-tight lg:hidden"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500/30 to-violet-500/30">
              <MapPin className="h-4 w-4 text-pink-600" />
            </div>
            {SITE.name}
          </Link>

          <Link
            href="/"
            className="mb-8 inline-flex items-center text-sm text-zinc-500 transition hover:text-zinc-900"
          >
            ← Accueil
          </Link>

          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
            {title}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">{description}</p>

          <div className="mt-8">{children}</div>

          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
