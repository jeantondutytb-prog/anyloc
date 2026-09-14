import { MapPin, Quote, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CHECKOUT_COPY, CHECKOUT_REVIEWS } from "@/lib/checkout-copy";
import { cn } from "@/lib/utils";

const AVATAR_STYLES = [
  "from-pink-500 to-rose-400",
  "from-violet-500 to-purple-500",
  "from-fuchsia-500 to-pink-500",
] as const;

function ReviewStars() {
  return (
    <div className="flex gap-0.5" aria-label="5 étoiles sur 5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className="h-4 w-4 fill-pink-500 text-pink-500"
        />
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  featured = false,
  styleIndex,
}: {
  review: (typeof CHECKOUT_REVIEWS)[number];
  featured?: boolean;
  styleIndex: number;
}) {
  const initials = review.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md",
        featured
          ? "border-pink-500/40 bg-gradient-to-b from-pink-500/10 to-violet-500/5 shadow-lg shadow-pink-500/10 ring-1 ring-pink-500/25 sm:-mt-2 sm:scale-[1.03] sm:p-7"
          : "border-zinc-200"
      )}
    >
      {featured ? (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
          Le plus cité
        </Badge>
      ) : null}

      <Quote
        className={cn(
          "text-pink-500/25",
          featured ? "h-10 w-10" : "h-8 w-8"
        )}
        aria-hidden="true"
      />

      <ReviewStars />

      <blockquote
        className={cn(
          "mt-4 flex-1 font-medium leading-snug text-zinc-800",
          featured ? "text-lg sm:text-xl" : "text-base"
        )}
      >
        « {review.text} »
      </blockquote>

      <div className="mt-6 flex items-center gap-3 border-t border-zinc-100 pt-4">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-md",
            AVATAR_STYLES[styleIndex % AVATAR_STYLES.length]
          )}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900">{review.name}</p>
          {review.city ? (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-pink-600">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {review.city}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function CheckoutReviewsGrid() {
  return (
    <section className="relative mt-12 overflow-hidden rounded-3xl border border-pink-500/15 bg-gradient-to-br from-pink-500/[0.08] via-white to-violet-500/[0.08] px-4 py-10 sm:px-8 sm:py-12">
      <div
        className="pointer-events-none absolute -top-16 right-0 h-48 w-48 rounded-full bg-pink-500/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-16 left-0 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-2xl text-center">
        <Badge className="mb-4">Avis vérifiés</Badge>
        <h3 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {CHECKOUT_COPY.reviewsTitle}
        </h3>
        <p className="mt-2 text-sm text-zinc-600">
          Des vrais abonnés, pas des captures inventées.
        </p>
      </div>

      <div className="relative mt-10 grid items-stretch gap-5 md:grid-cols-3 md:items-end">
        {CHECKOUT_REVIEWS.map((review, index) => (
          <ReviewCard
            key={review.name}
            review={review}
            styleIndex={index}
            featured={index === 0}
          />
        ))}
      </div>
    </section>
  );
}
