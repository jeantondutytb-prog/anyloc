import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ce soir, tu peux être à Marbella.
        </h2>
        <p className="mt-4 text-zinc-400">
          Le seul qui saura que tu n&apos;as pas bougé de ton canapé, c&apos;est
          toi. Pour tous les autres, tu es à l&apos;autre bout du monde.
        </p>
        <Link href="/register" className="mt-8 inline-block">
          <Button size="lg">
            Essai gratuit 3 jours
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
