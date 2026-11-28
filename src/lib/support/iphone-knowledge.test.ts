import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FAQ } from "@/lib/constants";
import { IOS_ADHOC_ELIGIBLE_PLANS } from "@/lib/ios-adhoc/config";
import { describeIphoneApp } from "./iphone-app";
import { buildSupportKnowledge, SUPPORT_FAQ_ANSWERS } from "./knowledge";

const knowledge = buildSupportKnowledge();

function section(title: string) {
  const start = knowledge.indexOf(title);
  assert.ok(start >= 0, `section « ${title} » absente`);
  const next = knowledge.indexOf("\n#", start + title.length);
  return knowledge.slice(start, next === -1 ? undefined : next);
}

describe("Léa : l'iPhone selon la formule", () => {
  it("ne dit plus que l'app iPhone est pour tout le monde", () => {
    assert.doesNotMatch(knowledge, /Le Mac ne sert qu'une seule fois/);
    assert.doesNotMatch(knowledge, /puis tu gères ta loc depuis l'iPhone, sans rebrancher l'ordi/);
    assert.doesNotMatch(knowledge, /Après, plus besoin de l'ordinateur\./);
  });

  it("réserve l'app iPhone à la formule 1 an", () => {
    assert.match(knowledge, /L'app Anyloc sur l'iPhone n'existe qu'en formule 1 an/);
    assert.match(section("### Formule 1 an"), /Préparer mon iPhone/);
  });

  it("en mensuel, c'est l'ordi qui tient la position, avec les 3 conseils", () => {
    const monthly = section("### Mensuel, 6 mois ou à vie");
    assert.match(monthly, /pas d'app iPhone/);
    assert.doesNotMatch(monthly, /Préparer mon iPhone|LocalDevVPN/);
    assert.match(monthly, /Anyloc bien ouvert sur l'ordi/);
    assert.match(monthly, /même Wi-Fi/);
    assert.match(monthly, /rebrancher l'iPhone en USB et cliquer « Appliquer la position »/);
  });

  it("demande la formule quand elle n'est pas connue", () => {
    assert.match(knowledge, /Tu as pris la formule 1 an, ou une autre/);
  });

  it("remplace les réponses iPhone de la FAQ du site, qui doivent encore exister", () => {
    const questions = new Set(FAQ.map((item) => item.q));
    for (const [question, answer] of Object.entries(SUPPORT_FAQ_ANSWERS)) {
      assert.ok(questions.has(question), `question de la FAQ renommée : ${question}`);
      assert.ok(knowledge.includes(`- ${question} → ${answer}`));
    }
  });

  it("dit pour chaque formule hors 1 an que l'ordi tient la position", () => {
    assert.match(knowledge, /Sur iPhone : pas d'app iPhone, c'est l'ordinateur qui tient la position\./);
    assert.match(knowledge, /Inclut l'app iPhone sans ordinateur\./);
  });
});

describe("describeIphoneApp", () => {
  it("suit la règle de isEligibleForIosAdhoc", () => {
    for (const plan of ["annual", "year_v2"]) {
      assert.ok(IOS_ADHOC_ELIGIBLE_PLANS.has(plan));
      assert.match(describeIphoneApp({ plan_id: plan, subscription_status: "active" }), /^App iPhone : incluse/);
    }
    assert.match(
      describeIphoneApp({ plan_id: null, subscription_status: null, is_clipper: true }),
      /^App iPhone : incluse/
    );
    assert.match(
      describeIphoneApp({ plan_id: null, subscription_status: null, is_admin: true }),
      /^App iPhone : incluse/
    );
  });

  it("dit au mensuel que c'est l'ordi qui tient la position", () => {
    for (const plan of ["monthly", "6months", "month_v2", "quarter_v2", "lifetime"]) {
      assert.match(
        describeIphoneApp({ plan_id: plan, subscription_status: "active" }),
        /^App iPhone : non incluse.*l'ordinateur qui tient la position/
      );
    }
  });

  it("ne donne pas l'app à une formule 1 an qui n'est plus active", () => {
    assert.match(describeIphoneApp({ plan_id: "annual", subscription_status: "canceled" }), /non incluse/);
  });
});
