import Link from "next/link";
import { Banknote, ChevronRight } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { HeaderActions } from "@/components/layout/header-actions";

export function Header() {
  return (
    // Floating pills instead of a full-width bar: the wrapper lets clicks
    // through, only the pills catch them.
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-2 pt-2 sm:px-4 sm:pt-3">
      <div className="pointer-events-auto mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full border border-zinc-200/80 bg-white/95 pr-2 pl-3 shadow-lg shadow-zinc-900/5 sm:bg-white/85 sm:pl-4 sm:backdrop-blur-md">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/#features"
            className="text-sm text-zinc-600 transition-colors hover:text-zinc-900"
          >
            Fonctionnalités
          </Link>
          <Link
            href="/#pricing"
            className="text-sm text-zinc-600 transition-colors hover:text-zinc-900"
          >
            Tarifs
          </Link>
          <Link
            href="/#faq"
            className="text-sm text-zinc-600 transition-colors hover:text-zinc-900"
          >
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/clippeurs?utm_campaign=site_header"
            data-track="clipper_link_clicked"
            data-track-location="header"
            className="hidden h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900 sm:inline-flex"
          >
            <Banknote className="h-4 w-4 text-pink-600" />
            Gagne de l&apos;argent
          </Link>
          <HeaderActions />
        </div>
      </div>

      {/* No room in the bar on a phone: a smaller pill under it. */}
      <div className="mt-2 flex justify-center sm:hidden">
        <Link
          href="/clippeurs?utm_campaign=site_header"
          data-track="clipper_link_clicked"
          data-track-location="header_mobile"
          className="pointer-events-auto inline-flex h-7 items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white/95 px-3 text-xs font-semibold text-zinc-800 shadow-md shadow-zinc-900/5 active:bg-zinc-100"
        >
          <Banknote className="h-3.5 w-3.5 text-pink-600" />
          Gagne de l&apos;argent avec tes vidéos
          <ChevronRight className="h-3.5 w-3.5 text-pink-600" />
        </Link>
      </div>
    </header>
  );
}
