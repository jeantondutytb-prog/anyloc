import Link from "next/link";
import { AlertTriangle, CreditCard, LogOut, Sparkles } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import type { SubscriptionInactiveDetails } from "@/lib/subscription-inactive";

function ReasonIcon({ reason }: { reason: SubscriptionInactiveDetails["reason"] }) {
  if (reason === "payment_failed") {
    return <CreditCard className="h-6 w-6 text-amber-700" />;
  }

  if (reason === "trial_cancelled" || reason === "trial_ended") {
    return <Sparkles className="h-6 w-6 text-pink-600" />;
  }

  return <AlertTriangle className="h-6 w-6 text-zinc-700" />;
}

export function SubscriptionExpiredView({
  details,
}: {
  details: SubscriptionInactiveDetails;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-zinc-200 bg-logo-background/95 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <Logo nameClassName="text-base font-bold sm:text-lg" />
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" className="text-zinc-600">
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
        <Card className="border-pink-200/80 bg-gradient-to-b from-pink-50/80 to-white p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
            <ReasonIcon reason={details.reason} />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            {details.title}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
            {details.description}
          </p>

          {details.previousPlanName ? (
            <p className="mt-4 rounded-xl border border-zinc-200 bg-white/80 px-4 py-3 text-sm text-zinc-600">
              Dernière formule :{" "}
              <span className="font-semibold text-zinc-900">
                {details.previousPlanName}
              </span>
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href={details.checkoutUrl} className="sm:flex-1">
              <Button className="w-full">{details.ctaLabel}</Button>
            </Link>
            <Link href="/pricing" className="sm:flex-1">
              <Button variant="secondary" className="w-full">
                Comparer les offres
              </Button>
            </Link>
          </div>

          {details.reason === "payment_failed" ? (
            <p className="mt-4 text-sm text-zinc-500">
              Tu peux aussi mettre à jour ta carte depuis le checkout Stripe, ou nous
              écrire sur{" "}
              <a
                href="mailto:support@anyloc.io"
                className="font-medium text-pink-600 underline-offset-2 hover:underline"
              >
                support@anyloc.io
              </a>
              .
            </p>
          ) : null}
        </Card>

        <p className="text-center text-sm text-zinc-500">
          Besoin d&apos;aide pour te reconnecter ?{" "}
          <Link href="/contact" className="font-medium text-pink-600 hover:underline">
            Contacte le support
          </Link>
        </p>
      </main>
    </div>
  );
}
