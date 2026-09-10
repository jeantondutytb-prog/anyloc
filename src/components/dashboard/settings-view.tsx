"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CreditCard,
  ExternalLink,
  FileText,
  KeyRound,
  Loader2,
  Mail,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthPasswordInput } from "@/components/auth/auth-input";
import { useAccount } from "@/hooks/use-account";
import { CANCELLATION_WARNING, PLANS, getCheckoutUrl } from "@/lib/constants";
import {
  deleteAccount,
  updatePassword,
  type SettingsActionState,
} from "@/app/dashboard/settings/actions";
import { formatSubscriptionStatusLabel } from "@/lib/account-billing-types";
import { cn } from "@/lib/utils";

const initialActionState: SettingsActionState = {};

function formatCardBrand(brand: string) {
  const labels: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
  };

  return labels[brand] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
}

function formatInvoiceStatus(status: string) {
  const labels: Record<string, string> = {
    paid: "Payée",
    open: "En attente",
    void: "Annulée",
    uncollectible: "Impayée",
    draft: "Brouillon",
  };

  return labels[status] ?? status;
}

function SettingsSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h2>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}

function BillingPortalButton({
  flow = "default",
  children,
  variant = "secondary",
  size = "sm",
  className,
}: {
  flow?: "default" | "subscription" | "payment_method";
  children: React.ReactNode;
  variant?: "default" | "secondary" | "ghost" | "outline";
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Impossible d'ouvrir le portail.");
      }

      if (payload.url) {
        window.location.href = payload.url;
      }
    } catch (portalError) {
      setError(
        portalError instanceof Error
          ? portalError.message
          : "Impossible d'ouvrir le portail."
      );
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={loading}
        onClick={() => void openPortal()}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {children}
      </Button>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function SettingsView() {
  const { data, loading, error } = useAccount();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordState, passwordAction, passwordPending] = useActionState(
    updatePassword,
    initialActionState
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteAccount,
    initialActionState
  );

  const currentPlan = PLANS.find((plan) => plan.id === data?.planId) ?? null;
  const alternativePlans = PLANS.filter((plan) => plan.id !== data?.planId);

  return (
    <div className="min-h-screen bg-background">
      <DashboardPageHeader title="Paramètres" />

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:px-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement de ton compte...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <SettingsSection title="Compte">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
                <Mail className="h-5 w-5 text-pink-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900">Email</p>
                <p className="mt-1 text-sm text-zinc-600">
                  {data?.email ?? "—"}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
                <KeyRound className="h-5 w-5 text-pink-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900">Modifier le mot de passe</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Choisis un nouveau mot de passe pour te connecter à ton compte.
                </p>

                {!showPasswordForm ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                    onClick={() => setShowPasswordForm(true)}
                  >
                    Modifier le mot de passe
                  </Button>
                ) : (
                  <form action={passwordAction} className="mt-4 space-y-4">
                    <AuthPasswordInput
                      id="password"
                      name="password"
                      label="Nouveau mot de passe"
                      autoComplete="new-password"
                      minLength={6}
                      required
                      showPassword={showPassword}
                      onToggle={() => setShowPassword((value) => !value)}
                    />
                    <AuthPasswordInput
                      id="confirmPassword"
                      name="confirmPassword"
                      label="Confirmer le mot de passe"
                      autoComplete="new-password"
                      minLength={6}
                      required
                      showPassword={showConfirmPassword}
                      onToggle={() => setShowConfirmPassword((value) => !value)}
                    />

                    {passwordState.error ? (
                      <p className="text-sm text-red-600">{passwordState.error}</p>
                    ) : null}
                    {passwordState.success ? (
                      <p className="text-sm text-emerald-600">{passwordState.success}</p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" size="sm" disabled={passwordPending}>
                        {passwordPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Enregistrer
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPasswordForm(false)}
                      >
                        Annuler
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </Card>

          <Card className="border-red-200 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900">Supprimer le compte</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Cette action est définitive. Ton abonnement sera annulé et tes
                  données supprimées.
                </p>

                {!showDeleteForm ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-4 border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50"
                    onClick={() => setShowDeleteForm(true)}
                  >
                    Supprimer mon compte
                  </Button>
                ) : (
                  <form action={deleteAction} className="mt-4 space-y-4">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>
                          Tape <strong>SUPPRIMER</strong> pour confirmer la
                          suppression définitive de ton compte.
                        </p>
                      </div>
                    </div>
                    <div>
                      <label
                        className="text-sm font-medium text-zinc-700"
                        htmlFor="confirmation"
                      >
                        Confirmation
                      </label>
                      <input
                        id="confirmation"
                        name="confirmation"
                        className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/20"
                        placeholder="SUPPRIMER"
                        required
                      />
                    </div>

                    {deleteState.error ? (
                      <p className="text-sm text-red-600">{deleteState.error}</p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={deletePending}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {deletePending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Supprimer définitivement
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeleteForm(false)}
                      >
                        Annuler
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </Card>
        </SettingsSection>

        <SettingsSection title="Abonnement">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
                <CreditCard className="h-5 w-5 text-pink-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-zinc-900">Plan actuel</p>
                  <Badge
                    className={cn(
                      data?.hasActiveSubscription
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-zinc-200 bg-zinc-50 text-zinc-600"
                    )}
                  >
                    {formatSubscriptionStatusLabel(data?.subscriptionStatus ?? null)}
                  </Badge>
                </div>

                <p className="mt-2 text-lg font-semibold text-zinc-900">
                  {data?.isAdmin
                    ? "Accès admin"
                    : currentPlan?.name ?? "Aucune formule active"}
                </p>

                {currentPlan ? (
                  <p className="mt-1 text-sm text-zinc-500">
                    {currentPlan.billedNote}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-zinc-500">
                    Choisis une formule pour débloquer toutes les fonctionnalités.
                  </p>
                )}

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {!data?.hasActiveSubscription ? (
                    <Link href={getCheckoutUrl("annual")}>
                      <Button size="sm">Souscrire à une offre</Button>
                    </Link>
                  ) : data?.canManageBilling ? (
                    <BillingPortalButton flow="subscription" variant="default">
                      Changer de formule
                    </BillingPortalButton>
                  ) : null}

                  {data?.hasActiveSubscription && alternativePlans.length > 0 ? (
                    alternativePlans.map((plan, index) => (
                      <Link key={plan.id} href={getCheckoutUrl(plan.id)}>
                        <Button variant="secondary" size="sm">
                          {index === 0 ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )}
                          Passer au plan {plan.name}
                        </Button>
                      </Link>
                    ))
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

          {data?.hasActiveSubscription && data?.canManageBilling ? (
            <Card className="border-amber-200 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-900">
                    Résilier mon abonnement
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {CANCELLATION_WARNING}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Si tu envisages une demande de remboursement au titre de la
                    garantie 48 h, fais-la{" "}
                    <strong>avant</strong> de résilier.
                  </p>

                  {!showCancelForm ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="mt-4 border-amber-200 text-amber-800 hover:border-amber-300 hover:bg-amber-50"
                      onClick={() => setShowCancelForm(true)}
                    >
                      Résilier mon abonnement
                    </Button>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <p className="font-medium">
                          Tu vas perdre l&apos;accès immédiatement
                        </p>
                        <p className="mt-1">
                          Dashboard, guides, téléchargements et modification GPS
                          : tout sera coupé dès confirmation sur Stripe.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <BillingPortalButton
                          flow="subscription"
                          variant="secondary"
                          size="sm"
                          className="border-amber-200 text-amber-800 hover:border-amber-300 hover:bg-amber-50"
                        >
                          Confirmer et résilier
                        </BillingPortalButton>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCancelForm(false)}
                        >
                          Annuler
                        </Button>
                      </div>

                      <p className="text-xs text-zinc-500">
                        Consulte la{" "}
                        <Link
                          href="/politique-d-annulation"
                          className="text-pink-600 hover:underline"
                        >
                          politique d&apos;annulation
                        </Link>{" "}
                        et la{" "}
                        <Link
                          href="/politique-de-remboursement"
                          className="text-pink-600 hover:underline"
                        >
                          politique de remboursement
                        </Link>
                        .
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ) : null}
        </SettingsSection>

        <SettingsSection title="Facturation">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
                <CreditCard className="h-5 w-5 text-pink-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900">Moyen de paiement</p>

                {data?.paymentMethod ? (
                  <p className="mt-2 text-sm text-zinc-600">
                    {formatCardBrand(data.paymentMethod.brand)} ••••{" "}
                    {data.paymentMethod.last4}
                    <span className="text-zinc-400">
                      {" "}
                      — expire {String(data.paymentMethod.expMonth).padStart(2, "0")}/
                      {data.paymentMethod.expYear}
                    </span>
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">
                    Aucun moyen de paiement enregistré.
                  </p>
                )}

                {data?.canManageBilling ? (
                  <BillingPortalButton
                    flow="payment_method"
                    className="mt-4"
                  >
                    {data.paymentMethod
                      ? "Modifier le moyen de paiement"
                      : "Ajouter un moyen de paiement"}
                  </BillingPortalButton>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
                <FileText className="h-5 w-5 text-pink-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900">
                  Historique des paiements / factures
                </p>

                {data?.invoices && data.invoices.length > 0 ? (
                  <ul className="mt-4 divide-y divide-zinc-100">
                    {data.invoices.map((invoice) => (
                      <li
                        key={invoice.id}
                        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-zinc-900">
                            {invoice.amount}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {new Date(invoice.date).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                            {" · "}
                            {formatInvoiceStatus(invoice.status)}
                          </p>
                        </div>
                        {invoice.pdfUrl ? (
                          <a
                            href={invoice.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-medium text-pink-600 hover:text-pink-700"
                          >
                            Télécharger
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">
                    Aucune facture pour le moment.
                  </p>
                )}

                {data?.canManageBilling ? (
                  <BillingPortalButton className="mt-4">
                    Voir toutes les factures
                  </BillingPortalButton>
                ) : null}
              </div>
            </div>
          </Card>
        </SettingsSection>
      </main>
    </div>
  );
}
