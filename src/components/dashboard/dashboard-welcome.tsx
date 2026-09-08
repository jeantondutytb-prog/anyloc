"use client";

import { CheckCircle2, MapPin, Smartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const previewSteps = [
  {
    icon: Smartphone,
    title: "Installe l'app",
    description: "Guide iOS ou Android depuis ton espace client.",
  },
  {
    icon: MapPin,
    title: "Choisis ta destination",
    description: "Un spot sur la carte ou un favori en un clic.",
  },
  {
    icon: CheckCircle2,
    title: "Active et envoie",
    description: "Lance le signal GPS et synchronise avec ton tel.",
  },
];

type DashboardWelcomeProps = {
  open: boolean;
  paymentSuccess: boolean;
  onStart: () => void;
  onSkip: () => void;
};

export function DashboardWelcome({
  open,
  paymentSuccess,
  onStart,
  onSkip,
}: DashboardWelcomeProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg p-6 sm:p-8">
        <div className="flex items-center gap-2 text-pink-600">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-medium">
            {paymentSuccess ? "Paiement confirmé" : "Première visite"}
          </span>
        </div>

        <h2 className="mt-4 text-2xl font-bold text-zinc-900 sm:text-3xl">
          {paymentSuccess
            ? "Bienvenue sur Anyloc !"
            : "On te guide pas à pas"}
        </h2>

        <p className="mt-3 text-sm text-zinc-600 sm:text-base">
          {paymentSuccess
            ? "Ton accès est actif. Suis ces 3 étapes pour envoyer ta première position sur ton téléphone."
            : "Avant de choisir une ville, commence par installer l'app sur ton mobile — c'est indispensable."}
        </p>

        <div className="mt-6 space-y-3">
          {previewSteps.map((step, index) => (
            <div
              key={step.title}
              className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-sm font-semibold text-pink-600">
                {index + 1}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <step.icon className="h-4 w-4 text-pink-600" />
                  <p className="font-medium text-zinc-900">{step.title}</p>
                </div>
                <p className="mt-1 text-sm text-zinc-500">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1" onClick={onStart}>
            Commencer le guide
          </Button>
          <Button variant="secondary" className="flex-1" onClick={onSkip}>
            Je connais déjà
          </Button>
        </div>
      </Card>
    </div>
  );
}
