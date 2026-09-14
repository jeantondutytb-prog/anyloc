import { Card } from "@/components/ui/card";
import { CHECKOUT_COPY, CHECKOUT_REVIEWS } from "@/lib/checkout-copy";

export function CheckoutReviewsGrid() {
  return (
    <div className="mt-12">
      <h3 className="text-center text-2xl font-bold tracking-tight text-zinc-900">
        {CHECKOUT_COPY.reviewsTitle}
      </h3>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {CHECKOUT_REVIEWS.map((review) => (
          <Card key={review.name} className="flex flex-col p-5">
            <blockquote className="flex-1 text-sm leading-relaxed text-zinc-700">
              « {review.text} »
            </blockquote>
            <p className="mt-4 text-sm font-semibold text-zinc-900">
              {review.name}
              {review.city ? (
                <span className="font-normal text-zinc-500"> · {review.city}</span>
              ) : null}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
