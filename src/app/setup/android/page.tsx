import Link from "next/link";
import { ArrowLeft, Check, Download, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SITE } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: `Installation ${SITE.name} sur Android — Guide APK`,
  description:
    "Installe Anyloc sur Android en 5 étapes : APK, options développeur et localisation fictive active en arrière-plan.",
  path: "/setup/android",
});

const steps = [
  {
    title: "Installe l'APK Anyloc",
    description:
      "Récupère le fichier depuis ton dashboard — c'est une version signée, prête à installer.",
    icon: Download,
  },
  {
    title: "Autorise l'installation",
    description:
      "Paramètres → Sécurité → autorise ton navigateur à installer des apps hors du Play Store.",
    icon: Settings,
  },
  {
    title: "Finalise l'installation",
    description:
      "Ouvre le fichier téléchargé et suis les étapes affichées à l'écran.",
    icon: Check,
  },
  {
    title: "Définis Anyloc comme source GPS",
    description:
      "Options pour les développeurs → Application de localisation fictive → sélectionne Anyloc.",
    icon: Shield,
  },
  {
    title: "Active ta première position",
    description:
      "Lance l'app, choisis un point sur la carte et démarre — le signal tourne en arrière-plan.",
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
          Installation sur Android
        </h1>
        <p className="mt-4 text-zinc-600">
          Tout se fait depuis ton téléphone. Une fois lancé, le signal GPS
          continue même avec l&apos;écran éteint.
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
            <li>• Android 10 minimum</li>
            <li>• Options développeur activées</li>
            <li>• Abonnement Anyloc actif</li>
          </ul>
        </Card>

        <div className="mt-8 flex gap-4">
          <Link href="/dashboard">
            <Button>Télécharger l&apos;APK</Button>
          </Link>
          <Link href="/setup/ios">
            <Button variant="secondary">Voir iOS</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
