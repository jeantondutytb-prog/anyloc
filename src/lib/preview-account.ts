import type { AccountBillingDetails } from "@/lib/account-billing-types";

/** Fake account for the dev-only /preview/dashboard?tab=account page. */
export const PREVIEW_ACCOUNT: AccountBillingDetails = {
  email: "client@exemple.test",
  planId: "annual",
  planName: "Annuel",
  subscriptionStatus: "active",
  hasActiveSubscription: true,
  isAdmin: false,
  isClipper: false,
  paymentMethod: { brand: "visa", last4: "4242", expMonth: 8, expYear: 2028 },
  invoices: [
    { id: "in_preview_2", date: "2026-10-02", amount: "49,00 €", status: "paid", pdfUrl: null },
    { id: "in_preview_1", date: "2025-10-02", amount: "49,00 €", status: "paid", pdfUrl: null },
  ],
  canManageBilling: true,
  cancelsAt: null,
};
