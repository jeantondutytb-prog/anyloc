"use client";

import Link from "next/link";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function SettingsView() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-900">Paramètres</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Télécharge l&apos;app et gère ton installation depuis ici.
      </p>

      <Card className="mt-8 border-pink-200 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
            <Download className="h-5 w-5 text-pink-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-zinc-900">
              Télécharger l&apos;app Anyloc
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Le téléchargement ne se trouve pas dans les réglages de ton
              téléphone — il est ici, dans ton espace client. Choisis ton
              système et suis le guide pas à pas.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link href="/setup/ios" className="flex-1">
                <Button variant="secondary" className="w-full">
                  <Smartphone className="h-4 w-4" />
                  iPhone (iOS)
                </Button>
              </Link>
              <Link href="/setup/android" className="flex-1">
                <Button variant="secondary" className="w-full">
                  <Smartphone className="h-4 w-4" />
                  Android (APK)
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="text-sm font-medium text-zinc-600">Compte & abonnement</h2>
        <p className="mt-2 text-sm text-zinc-500">
          La gestion de ton abonnement et de ton profil arrive bientôt. Pour
          l&apos;instant, concentre-toi sur l&apos;installation de l&apos;app
          ci-dessus.
        </p>
        <span className="mt-3 inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-500">
          Bientôt disponible
        </span>
      </Card>
    </div>
  );
}
