import Link from "next/link";
import { ArrowLeft, Check, Download, Monitor, Usb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SITE } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: `Installation ${SITE.name} sur iPhone — Guide iOS`,
  description:
    "Guide pas à pas pour installer Anyloc sur iPhone (iOS 17+). Mode développeur, Anyloc Setup et GPS spoofé sans jailbreak.",
  path: "/setup/ios",
});

const steps = [
  {
    title: "Récupère Anyloc Setup",
    description:
      "Dans ton espace client, télécharge le logiciel pour Mac (Ventura+) ou Windows 10+.",
    icon: Download,
  },
  {
    title: "Active le mode développeur",
    description:
      "Sur iPhone : Réglages → Confidentialité et sécurité → Mode développeur. Redémarre si le système te le demande.",
    icon: Monitor,
  },
  {
    title: "Connecte ton iPhone",
    description:
      "Branche-le en USB à ton ordinateur et accepte la demande de confiance à l'écran.",
    icon: Usb,
  },
  {
    title: "Lance l'installation",
    description:
      "Ouvre Anyloc Setup, sélectionne ton appareil et laisse le guide faire le reste — environ 2 minutes.",
    icon: Check,
  },
  {
    title: "Pilote depuis ton iPhone",
    description:
      "Une fois terminé, tout se gère depuis l'app mobile. L'ordinateur n'est plus nécessaire.",
    icon: Check,
  },
];

export default function SetupIosPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pt-28 pb-20 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au dashboard
        </Link>

        <Badge className="mt-6">iOS 17 / 18 / 26</Badge>
        <h1 className="mt-4 text-3xl font-bold text-zinc-900 sm:text-4xl">
          Installation sur iPhone
        </h1>
        <p className="mt-4 text-zinc-600">
          Apple impose une config initiale via ordinateur. Après ça, tu es
          autonome — sans jailbreak, sans bidouille.
        </p>

        <div className="mt-12 space-y-6">
          {steps.map((step, i) => (
            <Card key={step.title} className="flex gap-4 p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-sm font-bold text-pink-600">
                {i + 1}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <step.icon className="h-4 w-4 text-pink-600" />
                  <h3 className="font-semibold text-zinc-900">{step.title}</h3>
                </div>
                <p className="mt-2 text-sm text-zinc-500">{step.description}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-8 p-6">
          <h3 className="font-semibold text-zinc-900">Ce qu&apos;il te faut</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-500">
            <li>• iPhone sous iOS 17, 18 ou 26</li>
            <li>• Mac (Ventura+) ou PC Windows 10+</li>
            <li>• Câble USB Lightning ou USB-C</li>
            <li>• Abonnement Anyloc actif</li>
            <li>• Mode développeur activé</li>
          </ul>
        </Card>

        <div className="mt-8 flex gap-4">
          <Link href="/dashboard/settings">
            <Button>Télécharger Anyloc Setup</Button>
          </Link>
          <Link href="/setup/android">
            <Button variant="secondary">Voir Android</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
