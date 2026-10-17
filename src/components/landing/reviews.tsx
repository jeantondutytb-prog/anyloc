import Image from "next/image";
import { CHECKOUT_REVIEWS } from "@/lib/checkout-copy";

// The reviews that come with a profile photo (shared with the reviewer's consent).
const REVIEWS = CHECKOUT_REVIEWS.filter((review) => review.avatar).slice(0, 3);

export function Reviews() {
  return (
    <section data-track-section="reviews" className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Ce qu&apos;ils en disent
        </h2>

        <ul className="mx-auto mt-10 grid max-w-md gap-3 md:max-w-none md:grid-cols-3 md:gap-6">
          {REVIEWS.map((review) => (
            <li
              key={review.name}
              className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3"
            >
              <Image
                src={review.avatar!}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-800">« {review.text} »</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {review.name} · {review.city}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-center text-xs text-zinc-400">Avis de clients Anyloc.</p>
      </div>
    </section>
  );
}
