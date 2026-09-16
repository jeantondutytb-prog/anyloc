import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TrialCtaLink } from "@/components/navigation/trial-cta-link";
import { Logo } from "@/components/ui/logo";
import { getOnboardingUrl } from "@/lib/constants";
import { TRIAL_CTA_LABEL_SHORT } from "@/lib/trial";

export function Header() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-zinc-200 bg-logo-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/#features"
            className="text-sm text-zinc-600 transition-colors hover:text-zinc-900"
          >
            Fonctionnalités
          </Link>
          <Link
            href="/pricing"
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

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Connexion
            </Button>
          </Link>
          <TrialCtaLink
            href={getOnboardingUrl("annual")}
            label={TRIAL_CTA_LABEL_SHORT}
            size="sm"
            showArrow={false}
          />
        </div>
      </div>
    </header>
  );
}
