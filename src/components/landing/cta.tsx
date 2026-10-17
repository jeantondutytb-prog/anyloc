import { MainCta } from "@/components/landing/main-cta";
import { CHECKOUT_MARKETING_LINE } from "@/lib/constants";

export function Cta() {
  return (
    <section data-track-section="final_cta" className="py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Prêt à changer de life ?
        </h2>
        <p className="mt-4 text-zinc-600">
          {CHECKOUT_MARKETING_LINE}
        </p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <MainCta location="final_cta" />
        </div>
      </div>
    </section>
  );
}
