const steps = [
  {
    title: "Tu t'abonnes",
    description: "Paiement sécurisé, accès actif dès que c'est validé.",
  },
  {
    title: "Tu installes l'app",
    description:
      "Android : l'APK sur ton tel. iPhone : un passage sur l'ordi la première fois, puis l'app reste sur ton iPhone.",
  },
  {
    title: "Tu choisis ta ville",
    description:
      "Choisis une ville sur la carte et appuie sur « Définir cette position ».",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" data-track-section="how_it_works" className="bg-night py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Prêt en 3 étapes
        </h2>

        <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
          {steps.map((step, i) => (
            <li key={step.title}>
              <span className="text-sm font-semibold text-pink-400">{i + 1}</span>
              <h3 className="mt-1 text-lg font-semibold text-white">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
