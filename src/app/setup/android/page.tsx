import Link from "next/link";
import { ArrowLeft, Check, Download, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const steps = [
  {
    title: "Télécharge l'APK Anyloc",
    description:
      "Depuis ton dashboard, télécharge l'application Anyloc pour Android (APK signé).",
    icon: Download,
  },
  {
    title: "Autorise les sources inconnues",
    description:
      "Réglages → Sécurité → Autoriser l'installation d'apps de sources inconnues pour ton navigateur.",
    icon: Settings,
  },
  {
    title: "Installe l'application",
    description:
      "Ouvre le fichier APK téléchargé et suis les instructions d'installation.",
    icon: Check,
  },
  {
    title: "Active le mode développeur mock location",
    description:
      "Options développeur → Sélectionner une application de localisation fictive → Anyloc.",
    icon: Shield,
  },
  {
    title: "Lance et choisis ta position",
    description:
      "Ouvre Anyloc, sélectionne ta destination sur la carte et active le spoofing. Ça tourne en arrière-plan.",
    icon: Check,
  },
];

export default function SetupAndroidPage() {
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

        <Badge className="mt-6">Android 10+</Badge>
        <h1 className="mt-4 text-3xl font-bold text-zinc-900 sm:text-4xl">
          Guide d&apos;installation Android
        </h1>
        <p className="mt-4 text-zinc-600">
          Installation 100% autonome depuis ton téléphone. Le spoofing tient en
          arrière-plan, même écran verrouillé.
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
          <h3 className="font-semibold text-zinc-900">Prérequis</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-500">
            <li>• Android 10 ou supérieur</li>
            <li>• Options développeur activées</li>
            <li>• Abonnement Anyloc actif</li>
          </ul>
        </Card>

        <div className="mt-8 flex gap-4">
          <Link href="/dashboard">
            <Button>Télécharger l&apos;APK</Button>
          </Link>
          <Link href="/setup/ios">
            <Button variant="secondary">Guide iOS</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
