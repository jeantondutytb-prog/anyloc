"use client";

import Link from "next/link";
import { CreditCard, Mail, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";

export function SettingsView() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardPageHeader title="Paramètres" />

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Compte
          </h2>
          <Card className="mt-3 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
                <Mail className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="font-medium text-zinc-900">Email</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Gère ton email et ton mot de passe depuis ton espace client.
                </p>
              </div>
            </div>
          </Card>
        </section>

        <section id="abonnement">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Abonnement
          </h2>
          <Card className="mt-3 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
                <CreditCard className="h-5 w-5 text-pink-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900">Mon abonnement</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Consulte ta formule, tes factures et résilie en un clic depuis
                  Stripe.
                </p>
                <p className="mt-3 text-xs text-zinc-400">
                  Portail client bientôt disponible directement ici.
                </p>
              </div>
            </div>
          </Card>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Appareil
          </h2>
          <Card className="mt-3 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
                <Smartphone className="h-5 w-5 text-pink-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900">Installation & liaison</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Télécharge l&apos;app, lie ton téléphone et génère ton code de
                  connexion.
                </p>
                <Link href="/dashboard/installation" className="mt-4 inline-block">
                  <Button variant="secondary" size="sm">
                    Voir le guide
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
