import Image from "next/image";
import appTeleport from "../../../public/landing/app-teleport.webp";

const points = [
  {
    title: "Toutes tes apps d'un coup",
    body: "Snap, Insta, Tinder, Bumble, Pokémon GO, Life360 : elles lisent toutes le même GPS, donc elles voient toutes la même ville.",
  },
  {
    title: "Une ville en un tap",
    body: "Cherche une adresse ou touche la carte, puis « Définir cette position ». Ta vraie position revient quand tu veux.",
  },
  {
    title: "Des trajets qui ont l'air vrais",
    body: "Trace un parcours, choisis la vitesse à pied ou en voiture, ajoute des pauses. Ta loc se déplace toute seule.",
  },
];

export function AppShowcase() {
  return (
    <section id="app" data-track-section="app_showcase" className="py-20 sm:py-28">
      <div className="mx-auto grid max-w-5xl items-center gap-12 px-4 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-16">
        <div className="mx-auto w-full max-w-[280px] md:order-2 md:max-w-[320px]">
          <div className="rounded-[2.75rem] bg-zinc-900 p-2.5 shadow-2xl shadow-zinc-900/25 ring-1 ring-zinc-700">
            <Image
              src={appTeleport}
              alt="L'app Anyloc sur iPhone : un pin posé sur New York, prêt à être défini comme position."
              sizes="(min-width: 768px) 320px, 280px"
              className="h-auto w-full rounded-[2.25rem]"
              placeholder="blur"
            />
          </div>
        </div>

        <div className="md:order-1">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Tu poses le pin, ton tel y est.
          </h2>
          <p className="mt-4 text-zinc-600">
            Un VPN change ton IP, pas ton GPS. Anyloc change directement le GPS
            du téléphone.
          </p>

          <dl className="mt-10 divide-y divide-zinc-200 border-y border-zinc-200">
            {points.map((point) => (
              <div key={point.title} className="py-5">
                <dt className="font-semibold text-zinc-900">{point.title}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                  {point.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
