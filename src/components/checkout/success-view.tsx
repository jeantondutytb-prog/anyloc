"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import type { Plan } from "@/lib/constants";

const NEXT_STEPS = [
  {
    title: "Choisis ta plateforme",
    description:
      "Android : tout depuis ton tel. iPhone : une config initiale via ordi, puis autonome.",
    icon: Smartphone,
  },
  {
    title: "Suis le guide d'installation",
    description:
      "Étapes pas à pas adaptées à ton modèle — environ 5 minutes pour être opérationnel.",
    icon: CheckCircle2,
  },
  {
    title: "Pose ton premier pin",
    description:
      "Ouvre le dashboard, choisis une ville et active ton signal GPS en un clic.",
    icon: MapPin,
  },
];

export function SuccessView({
  plan,
  customerEmail,
}: {
  plan: Plan | null;
  customerEmail: string | null;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-logo-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 sm:h-16 sm:px-5">
          <Logo nameClassName="text-base font-extrabold tracking-tight sm:text-lg" />
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 transition hover:text-zinc-900"
          >
            Dashboard →
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-5 sm:py-14">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700">
              <Sparkles className="h-3.5 w-3.5" />
              Paiement confirmé
            </p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
              Bienvenue dans Anyloc !
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-600 sm:text-base">
              Ton accès est actif. Installe l&apos;app sur ton téléphone et
              commence à choisir où tu veux être.
            </p>
            {customerEmail && (
              <p className="mt-2 text-xs text-zinc-500">
                Confirmation envoyée à{" "}
                <span className="font-medium text-zinc-700">{customerEmail}</span>
              </p>
            )}
          </div>

          {plan && (
            <Card className="mt-8 border-2 border-zinc-900 bg-pink-50/50 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Ton abonnement
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-zinc-900">
                    {plan.name}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">{plan.billedNote}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-2xl font-extrabold text-zinc-900">
                    {plan.price}
                  </p>
                  <p className="text-xs text-zinc-500">{plan.period}</p>
                </div>
              </div>
            </Card>
          )}

          <section className="mt-10">
            <h2 className="text-xl font-extrabold tracking-tight text-zinc-900">
              Prochaines étapes
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Tu es à quelques minutes de ta première loc fictive.
            </p>

            <div className="mt-6 space-y-4">
              {NEXT_STEPS.map((step, index) => (
                <Card key={step.title} className="flex gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-sm font-bold text-pink-600">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <step.icon className="h-4 w-4 text-pink-600" />
                      <h3 className="font-semibold text-zinc-900">
                        {step.title}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                      {step.description}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-extrabold tracking-tight text-zinc-900">
              Installe Anyloc sur ton téléphone
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Choisis ton système pour accéder au guide détaillé.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Link href="/setup/android" className="group">
                <Card className="h-full p-5 transition hover:border-pink-300 hover:shadow-md">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Android
                  </p>
                  <p className="mt-2 text-lg font-bold text-zinc-900">
                    Installation APK
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Tout depuis ton tel — signal GPS actif même écran éteint.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-pink-600 group-hover:gap-2 transition-all">
                    Voir le guide
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Card>
              </Link>

              <Link href="/setup/ios" className="group">
                <Card className="h-full p-5 transition hover:border-pink-300 hover:shadow-md">
                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                    iPhone
                  </p>
                  <p className="mt-2 text-lg font-bold text-zinc-900">
                    Installation iOS
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Config initiale via Mac ou PC, puis pilotage depuis ton
                    iPhone.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-pink-600 group-hover:gap-2 transition-all">
                    Voir le guide
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Card>
              </Link>
            </div>
          </section>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/dashboard">
              <Button size="lg">
                Ouvrir le dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/setup/android">
              <Button variant="secondary" size="lg">
                Commencer l&apos;installation
              </Button>
            </Link>
          </div>

          <p className="mt-8 text-center text-xs leading-relaxed text-zinc-500">
            Besoin d&apos;aide ? Réponds à l&apos;email de confirmation ou
            contacte le support depuis ton dashboard.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
