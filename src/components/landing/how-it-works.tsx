import { Download, MapPin, CreditCard } from "lucide-react";

const steps = [
  {
    icon: CreditCard,
    title: "Tu t'abonnes",
    description:
      "Paiement sécurisé. Ton compte s'active instantanément après validation.",
  },
  {
    icon: Download,
    title: "Tu installes l'app",
    description:
      "Android : installation directe sur ton tel, guidé pas à pas. iPhone : setup unique depuis Mac/PC, puis autonomie totale.",
  },
  {
    icon: MapPin,
    title: "Tu poses ton point",
    description:
      "Ouvre la carte, choisis ta destination, lance. Ta position change pour toutes tes apps en direct.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-white/5 bg-white/[0.02] py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Opérationnel en 3 étapes
          </h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="relative text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <step.icon className="h-6 w-6 text-emerald-400" />
              </div>
              <span className="mt-4 inline-block text-xs font-medium text-emerald-400">
                Étape {i + 1}
              </span>
              <h3 className="mt-2 text-lg font-semibold text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-zinc-500">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
