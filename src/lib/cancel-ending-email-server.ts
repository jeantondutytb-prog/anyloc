import type Stripe from "stripe";
import {
  buildCancelEndingEmail,
  CANCEL_SCHEDULED_KEY,
  getCancellationEndUnix,
  markCancelEndingEmailSent,
  shouldSendCancelEndingEmail,
} from "@/lib/cancel-ending-email";
import { isResendConfigured, sendEmail } from "@/lib/email/resend";
import { logError } from "@/lib/log-error";
import { getAppUrl, stripe } from "@/lib/stripe";

function getCustomerEmail(subscription: Stripe.Subscription) {
  const customer = subscription.customer;
  return typeof customer === "object" && !customer.deleted ? customer.email : null;
}

/** Daily: reminds customers ~3 days before a scheduled cancellation ends their access. */
export async function sendCancelEndingEmails(now = new Date()) {
  if (!stripe || !isResendConfigured()) {
    return { sent: 0, failed: 0, skipped: "not_configured" as const };
  }

  const appUrl = getAppUrl();
  let sent = 0;
  let failed = 0;
  let page: string | undefined;

  do {
    const result = await stripe.subscriptions.search({
      query: `status:'active' AND metadata['${CANCEL_SCHEDULED_KEY}']:'true'`,
      expand: ["data.customer"],
      limit: 100,
      page,
    });

    for (const subscription of result.data) {
      const endsAt = getCancellationEndUnix(subscription);
      const email = getCustomerEmail(subscription);

      if (!endsAt || !email || !shouldSendCancelEndingEmail(subscription, now)) {
        continue;
      }

      try {
        await sendEmail({
          to: email,
          ...buildCancelEndingEmail({ appUrl, endsAt: new Date(endsAt * 1000) }),
          tags: [{ name: "campaign", value: "cancel_ending" }],
        });
        await stripe.subscriptions.update(subscription.id, {
          metadata: markCancelEndingEmailSent(subscription.metadata),
        });
        sent += 1;
      } catch (error) {
        failed += 1;
        await logError("cancel-ending-email", error, {
          stripe_subscription_id: subscription.id,
        });
      }
    }

    page = result.has_more ? result.next_page ?? undefined : undefined;
  } while (page);

  return { sent, failed };
}
