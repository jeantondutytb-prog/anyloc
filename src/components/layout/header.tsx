import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { ClipperBanner } from "@/components/layout/clipper-banner";
import { CHECKOUT_CTA_LABEL_SHORT, DEFAULT_PLAN_ID, getOnboardingUrl } from "@/lib/constants";
import { OnboardingLink } from "@/components/onboarding/onboarding-link";

export function Header() {
  return (
    // Fixed: pages offset their content by --header-height (banner + navbar).
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-night">
      <ClipperBanner />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo nameClassName="text-white" />

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/#app"
            className="text-sm text-zinc-300 transition-colors hover:text-white"
          >
            L&apos;app
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-zinc-300 transition-colors hover:text-white"
          >
            Tarifs
          </Link>
          <Link
            href="/#faq"
            className="text-sm text-zinc-300 transition-colors hover:text-white"
          >
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" data-track="login_link_clicked" data-track-location="header">
            <Button variant="ghost" size="sm" className="text-zinc-300 hover:bg-white/10 hover:text-white">
              Connexion
            </Button>
          </Link>
          <OnboardingLink href={getOnboardingUrl(DEFAULT_PLAN_ID)} data-track="cta_clicked" data-track-location="header" data-track-plan={DEFAULT_PLAN_ID}>
            <Button size="sm">{CHECKOUT_CTA_LABEL_SHORT}</Button>
          </OnboardingLink>
        </div>
      </div>
    </header>
  );
}
