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
