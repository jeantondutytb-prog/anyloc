import Link from "next/link";
import { ArrowLeft, Check, Download, Monitor, Usb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const steps = [
  {
    title: "Télécharge Anyloc Setup",
    description:
      "Depuis ton dashboard, télécharge Anyloc Setup pour Mac (Ventura+) ou Windows 10+.",
    icon: Download,
  },
  {
    title: "Active le mode développeur",
    description:
      "Sur ton iPhone : Réglages → Confidentialité → Mode développeur. Redémarre ton iPhone si demandé.",
    icon: Monitor,
  },
  {
    title: "Branche ton iPhone en USB",
    description:
      "Connecte ton iPhone à ton Mac/PC avec un câble USB. Fais confiance à l'ordinateur si demandé.",
    icon: Usb,
  },
  {
    title: "Installe l'app Anyloc",
    description:
      "Lance Anyloc Setup, sélectionne ton iPhone et suis les instructions à l'écran. L'installation prend ~2 minutes.",
    icon: Check,
  },
  {
    title: "Contrôle depuis ton iPhone",
    description:
      "Une fois installé, ouvre Anyloc sur ton iPhone. Choisis ta position sur la carte — plus besoin de l'ordinateur.",
    icon: Check,
  },
];

export default function SetupIosPage() {
  return (
    <div className="min-h-screen bg-[#050508]">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pt-28 pb-20 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au dashboard
        </Link>

        <Badge className="mt-6">iOS 17 / 18 / 26</Badge>
        <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
          Guide d&apos;installation iOS
        </h1>
        <p className="mt-4 text-zinc-400">
          Une mise en route unique depuis ton ordinateur, puis tu pilotes tout
          depuis ton iPhone. Aucun jailbreak requis.
        </p>

        <div className="mt-12 space-y-6">
          {steps.map((step, i) => (
            <Card key={step.title} className="flex gap-4 p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-sm font-bold text-emerald-400">
                {i + 1}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <step.icon className="h-4 w-4 text-emerald-400" />
                  <h3 className="font-semibold text-white">{step.title}</h3>
                </div>
                <p className="mt-2 text-sm text-zinc-500">{step.description}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-8 p-6">
          <h3 className="font-semibold text-white">Prérequis</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-500">
            <li>• iPhone avec iOS 17, 18 ou 26</li>
            <li>• Mac (Ventura+) ou PC Windows 10+</li>
            <li>• Câble USB Lightning ou USB-C</li>
            <li>• Abonnement Anyloc actif</li>
            <li>• Mode développeur activé</li>
          </ul>
        </Card>

        <div className="mt-8 flex gap-4">
          <Link href="/dashboard">
            <Button>Télécharger Anyloc Setup</Button>
          </Link>
          <Link href="/setup/android">
            <Button variant="secondary">Guide Android</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
