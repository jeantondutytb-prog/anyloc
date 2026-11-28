import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

// Same Stripe price for the v1 and v3 annual (and monthly), as in production:
// set before constants.ts reads them.
process.env.STRIPE_PRICE_MONTHLY = "price_test_monthly";
process.env.STRIPE_PRICE_ANNUAL = "price_test_annual";
process.env.STRIPE_PRICE_6MONTHS = "price_test_6months";
process.env.STRIPE_PRICE_LIFETIME = "price_test_lifetime";

type Constants = typeof import("./constants");
let DEVICE_REQUIREMENT_NOTE: Constants["DEVICE_REQUIREMENT_NOTE"];
let FAQ: Constants["FAQ"];
let PLANS: Constants["PLANS"];
let getCanonicalPlanId: Constants["getCanonicalPlanId"];
let IOS_ADHOC_ELIGIBLE_PLANS: Set<string>;

before(async () => {
  ({ DEVICE_REQUIREMENT_NOTE, FAQ, PLANS, getCanonicalPlanId } = await import("./constants"));
  ({ IOS_ADHOC_ELIGIBLE_PLANS } = await import("./ios-adhoc/config"));
});

function faq(question: string) {
  const item = FAQ.find((entry) => entry.q === question);
  assert.ok(item, `question absente : ${question}`);
  return item.a;
}

describe("site : l'app iPhone seulement en formule 1 an", () => {
  it("mobileApp suit l'accès réel (plan enregistré sur le profil)", () => {
    for (const plan of PLANS) {
      assert.equal(
        plan.mobileApp,
        IOS_ADHOC_ELIGIBLE_PLANS.has(getCanonicalPlanId(plan.id)),
        `${plan.id} : mobileApp ne colle pas à isEligibleForIosAdhoc`
      );
    }
  });

  it("annual_v3 est enregistré comme annual, qui a l'app iPhone", () => {
    assert.equal(getCanonicalPlanId("annual_v3"), "annual");
    assert.equal(getCanonicalPlanId("monthly_v3"), "monthly");
    assert.equal(getCanonicalPlanId("lifetime"), "lifetime");
  });

  it("la FAQ ne dit plus que l'ordi ne sert qu'une fois", () => {
    for (const item of FAQ) {
      assert.doesNotMatch(item.a, /ne sert qu'une seule fois|sans rebrancher l'ordi/, item.q);
    }
  });

  it("la FAQ dit qu'en mensuel, 6 mois ou à vie c'est l'ordi qui tient la position", () => {
    for (const question of [
      "Ça passe sur iPhone et Android ?",
      "Faut-il garder le Mac branché ?",
      "La loc reste active si je ferme l'app ?",
    ]) {
      const answer = faq(question);
      assert.match(answer, /formule 1 an/, question);
      assert.match(answer, /En mensuel, 6 mois ou à vie/, question);
      assert.match(answer, /ordi/, question);
    }
    assert.match(faq("Faut-il garder le Mac branché ?"), /même Wi-Fi, avec Anyloc ouvert et l'ordi éveillé/);
  });

  it("la note avant achat et le plan à vie disent la même chose", () => {
    assert.doesNotMatch(DEVICE_REQUIREMENT_NOTE, /une fois/);
    assert.match(DEVICE_REQUIREMENT_NOTE, /sauf avec la formule 1 an/);
    const lifetime = PLANS.find((plan) => plan.id === "lifetime")!;
    assert.equal(lifetime.mobileApp, false);
    assert.match(lifetime.billedNote, /pas d'app : c'est ton ordi \(Mac ou PC\) qui tient ta position/);
  });

  it("les prix ne bougent pas", () => {
    const prices = Object.fromEntries(PLANS.map((plan) => [plan.id, plan.price]));
    assert.deepEqual(prices, {
      monthly: "9,90€",
      "6months": "34,90€",
      annual: "49,00€",
      month_v2: "19€",
      quarter_v2: "29€",
      year_v2: "79€",
      monthly_v3: "9,90€",
      annual_v3: "49,00€",
      lifetime: "89€",
    });
  });
});
