import type { Plan } from "@/lib/constants";
import { getPlanMonths } from "@/lib/price-display-experiment";

type PricedPlan = Pick<Plan, "id" | "price">;

/** "49,00€" -> 49 ; "9,90 €" -> 9.9. */
function parsePrice(price: string) {
  return Number(price.replace("€", "").replace(",", ".").trim());
}

/** Real monthly cost of a plan, in euros. */
function getMonthlyCost(plan: PricedPlan) {
  return parsePrice(plan.price) / getPlanMonths(plan.id);
}

/**
 * What one month costs on this plan, exact and rounded to the cent (no charm
 * rounding): 9,90 € -> "9,90", 34,90 € / 6 -> "5,82", 49 € / 12 -> "4,08".
 */
export function getPerMonthPrice(plan: PricedPlan) {
  const cents = Math.round(getMonthlyCost(plan) * 100);
  return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * How much cheaper than the reference (monthly) plan one month of this plan
 * is, in whole percent: annual 49 € vs 9,90 € -> 59, 6 months -> 41. 0 when
 * it is not cheaper.
 */
export function getSavingsPercent(plan: PricedPlan, reference: PricedPlan) {
  const referenceCost = getMonthlyCost(reference);
  if (!(referenceCost > 0)) return 0;
  const percent = Math.round((1 - getMonthlyCost(plan) / referenceCost) * 100);
  return percent > 0 ? percent : 0;
}

/** "chaque mois", "tous les 6 mois", "tous les 12 mois". */
export function getBillingCadence(planId: string) {
  const months = getPlanMonths(planId);
  return months === 1 ? "chaque mois" : `tous les ${months} mois`;
}

/** Line under the paywall button: what is charged now and when it renews. */
export function getPayTodayLine(plan: PricedPlan, firstPayment?: string) {
  const amount = firstPayment ?? plan.price.replace("€", " €");
  return `${amount} à payer aujourd'hui, puis ${getBillingCadence(plan.id)} · Résiliable en 1 clic`;
}

/** "49,00€" -> "49 €", "9,90€" -> "9,90 €", "29 €" -> "29 €": the order page's amounts. */
export function formatOrderPrice(price: string) {
  return `${price.replace("€", "").trim().replace(/,00$/, "")} €`;
}

/** "1 mois", "6 mois", "12 mois": the order page's period switcher. */
export function getPeriodLabel(planId: string) {
  return `${getPlanMonths(planId)} mois`;
}

export type OrderOffers = {
  /** "4,95 €" while the -50 % welcome offer applies to this plan's 1st month. */
  welcomeOfferPrice?: string;
  /** "29 €": the accepted annual exit offer, kept at every renewal. */
  annualExitOfferPrice?: string;
};

/** Big amount of the order page's bar: what the card is charged today. */
export function getOrderPayToday(plan: PricedPlan, offers: OrderOffers = {}) {
  return formatOrderPrice(offers.annualExitOfferPrice ?? offers.welcomeOfferPrice ?? plan.price);
}

/**
 * Line under that amount: "puis 9,90 € chaque mois". The welcome offer only
 * discounts the 1st month, so it renews at the plan price; the annual exit
 * offer keeps its price: "puis 29 € tous les 12 mois".
 */
export function getOrderRenewalLine(plan: PricedPlan, offers: OrderOffers = {}) {
  const renewal = formatOrderPrice(offers.annualExitOfferPrice ?? plan.price);
  return `puis ${renewal} ${getBillingCadence(plan.id)}`;
}

export type PlanValueCard = { kind: "savings" | "guarantee"; title: string; text: string };

/** The one value card under the plans: savings on a long plan, the guarantee on a monthly one. */
export function getPlanValueCard(
  plan: PricedPlan & { mobileApp?: boolean },
  reference: PricedPlan
): PlanValueCard {
  const months = getPlanMonths(plan.id);
  const percent = getSavingsPercent(plan, reference);
  if (months <= 1 || percent <= 0) {
    return {
      kind: "guarantee",
      title: "Garantie 48 h",
      text: "Si ta loc ne bouge pas, ton 1er paiement est remboursé.",
    };
  }
  const span = months === 12 ? "avec l'annuel" : `sur ${months} mois`;
  return {
    kind: "savings",
    title: `${getPerMonthPrice(plan)} € par mois ${span}`,
    text: `${percent} % moins cher que le mensuel${plan.mobileApp ? ", et l'app mobile est incluse" : ""}.`,
  };
}
