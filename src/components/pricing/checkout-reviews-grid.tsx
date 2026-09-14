import { MapPin, Star } from "lucide-react";
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
          className="h-3 w-3 fill-pink-500 text-pink-500"
        />
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  styleIndex,
}: {
  review: (typeof CHECKOUT_REVIEWS)[number];
  styleIndex: number;
}) {
  const initials = review.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <ReviewStars />

      <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-zinc-700">
        « {review.text} »
      </blockquote>

      <div className="mt-3 flex items-center gap-2.5 border-t border-zinc-100 pt-3">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white",
            AVATAR_STYLES[styleIndex % AVATAR_STYLES.length]
          )}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900">{review.name}</p>
          {review.city ? (
            <p className="flex items-center gap-1 text-xs text-pink-600">
              <MapPin className="h-3 w-3 shrink-0" />
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
    <section className="relative mt-10 overflow-hidden rounded-2xl border border-pink-500/15 bg-gradient-to-br from-pink-500/[0.06] via-white to-violet-500/[0.06] px-3 py-6 sm:px-6 sm:py-8">
      <div className="relative mx-auto max-w-2xl text-center">
        <Badge className="mb-3 text-[10px]">Avis vérifiés</Badge>
        <h3 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
          {CHECKOUT_COPY.reviewsTitle}
        </h3>
      </div>

      <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
        {CHECKOUT_REVIEWS.map((review, index) => (
          <ReviewCard
            key={review.name}
            review={review}
            styleIndex={index}
          />
        ))}
      </div>
    </section>
  );
}
