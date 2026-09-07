import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Cta() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Prêt à changer de décor ?
        </h2>
        <p className="mt-4 text-zinc-600">
          Toi tu connais la vérité. Eux, ils voient Marbella. C&apos;est tout
          ce qui compte sur la map.
        </p>
        <Link href="/signup" className="mt-8 inline-block">
          <Button size="lg">
            Commencer maintenant
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
