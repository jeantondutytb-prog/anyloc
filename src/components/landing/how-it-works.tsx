import { Download, MapPin, CreditCard } from "lucide-react";

const steps = [
  {
    icon: CreditCard,
    title: "Crée ton compte",
    description:
      "Choisis ta formule, valide en ligne — ton accès Anyloc est prêt en quelques secondes.",
  },
  {
    icon: Download,
    title: "Configure ton tel",
    description:
      "Android : tout depuis le mobile, étape par étape. iPhone : branchement unique à un ordi, puis c'est bon.",
  },
  {
    icon: MapPin,
    title: "Choisis ta destination",
    description:
      "Sélectionne un spot sur la map, active le signal — toutes tes apps basculent au même endroit.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-zinc-200 bg-pink-50/50 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Opérationnel en quelques minutes
          </h2>
          <p className="mt-4 text-zinc-600">
            Pas besoin d&apos;être un crack en tech. On te guide de
            l&apos;inscription à ta première loc.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="relative text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-500/10 border border-pink-500/20">
                <step.icon className="h-6 w-6 text-pink-600" />
              </div>
              <span className="mt-4 inline-block text-xs font-medium text-pink-600">
                {i + 1} / 3
              </span>
              <h3 className="mt-2 text-lg font-semibold text-zinc-900">
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
