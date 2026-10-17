import { CreditCard, Download, MapPin } from "lucide-react";

const steps = [
  {
    icon: CreditCard,
    title: "Tu t'abonnes",
    description:
      "Paiement sécurisé. Ton accès est actif dès que c'est validé.",
  },
  {
    icon: Download,
    title: "Tu installes l'app",
    description:
      "Android : APK sur le tel. iPhone : ordi une fois, puis l'app reste sur ton iPhone.",
  },
  {
    icon: MapPin,
    title: "Tu poses ta pin",
    description:
      "Ouvre l'app, choisis une ville sur la carte, appuie sur Démarrer. C'est tout.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" data-track-section="how_it_works" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Opérationnel en 3 étapes
          </h2>
          <p className="mt-4 text-zinc-600">
            Paie, installe, change de ville — depuis ton téléphone.
          </p>
        </div>

        {/* A compact list on a phone, three columns from md up. */}
        <ol className="mx-auto mt-10 grid max-w-md gap-6 md:mt-16 md:max-w-none md:grid-cols-3 md:gap-8">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4 md:flex-col md:items-center md:text-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
                <step.icon className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <span className="text-xs font-medium text-pink-600 md:mt-2 md:inline-block">
                  {i + 1} / 3
                </span>
                <h3 className="font-semibold text-zinc-900 md:mt-1 md:text-lg">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
