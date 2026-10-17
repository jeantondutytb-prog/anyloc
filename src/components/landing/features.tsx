import { Bookmark, MapPin, Route } from "lucide-react";
import { FEATURES } from "@/lib/constants";

const iconMap = {
  MapPin,
  Route,
  Bookmark,
};

export function Features() {
  return (
    <section id="features" data-track-section="features" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Un seul cheat code pour tout ton tel
          </h2>
          <p className="mt-4 text-zinc-600">
            Fini les apps qui marchent que sur Snap. Anyloc touche le GPS à la
            source — chaque app lit la même loc.
          </p>
        </div>

        {/* A compact list on a phone, three columns from md up. */}
        <div className="mx-auto mt-10 grid max-w-md gap-6 md:mt-16 md:max-w-none md:grid-cols-3 md:gap-8">
          {FEATURES.map((feature) => {
            const Icon = iconMap[feature.icon as keyof typeof iconMap];
            return (
              <div key={feature.title} className="flex gap-4 md:flex-col md:items-center md:text-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
                  <Icon className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 md:mt-1 md:text-lg">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
