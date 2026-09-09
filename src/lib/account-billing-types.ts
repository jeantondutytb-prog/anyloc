export type AccountInvoice = {
  id: string;
  date: string;
  amount: string;
  status: string;
  pdfUrl: string | null;
};

export type AccountPaymentMethod = {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

export type AccountBillingDetails = {
  email: string;
  planId: string | null;
  planName: string | null;
  subscriptionStatus: string | null;
  hasActiveSubscription: boolean;
  isAdmin: boolean;
  paymentMethod: AccountPaymentMethod | null;
  invoices: AccountInvoice[];
  canManageBilling: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  trialing: "Essai",
  canceled: "Annulé",
  past_due: "Paiement en retard",
  incomplete: "Incomplet",
  unpaid: "Impayé",
  admin: "Admin",
};

export function formatSubscriptionStatusLabel(status: string | null) {
  if (!status) {
    return "Aucun abonnement";
  }

  return STATUS_LABELS[status] ?? status;
}
