import {
  Bookmark,
  Globe,
  MapPin,
  Monitor,
  Route,
  Smartphone,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { FEATURES } from "@/lib/constants";

const iconMap = {
  MapPin,
  Smartphone,
  Route,
  Bookmark,
  Globe,
  Monitor,
};

export function Features() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Un seul outil pour tout ton téléphone
          </h2>
          <p className="mt-4 text-zinc-600">
            Fini les apps qui ne marchent que sur Snap. Anyloc touche le GPS
            à la source — chaque application lit la même position.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = iconMap[feature.icon as keyof typeof iconMap];
            return (
              <Card key={feature.title} className="p-6 transition-colors hover:border-pink-500/20">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10">
                  <Icon className="h-5 w-5 text-pink-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
