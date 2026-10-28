import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAskedQuestions,
  getMainQuizApp,
  getQuizFinalSteps,
  getQuizRecommendation,
  listQuizApps,
  QUIZ_QUESTIONS,
} from "./onboarding-quiz";
import {
  getAppSignupUrl,
  getQuizSignupUrl,
  isOnboardingQuizPath,
  isRemoteAppPath,
  pickOnboardingVariant,
} from "./onboarding-experiment";

const marbella = {
  id: "Marbella — Puerto Banús",
  city: "Marbella",
  area: "Puerto Banús",
  emoji: "🇪🇸",
  lat: 36.48,
  lng: -4.95,
};

describe("quiz questions", () => {
  it("never leave one card alone on a row", () => {
    for (const question of QUIZ_QUESTIONS) {
      assert.ok([2, 3, 4, 6].includes(question.options.length), question.id);
    }
  });

  it("only ask for the computer on iPhone", () => {
    assert.ok(getAskedQuestions({ device: ["iphone"] }).some((q) => q.id === "computer"));
    assert.ok(!getAskedQuestions({ device: ["android"] }).some((q) => q.id === "computer"));
  });
});

describe("getQuizRecommendation", () => {
  it("recommends the plan with the iPhone app to iPhone users, in either grid", () => {
    assert.equal(getQuizRecommendation({ device: ["iphone"] }, "v1").planId, "annual");
    assert.equal(getQuizRecommendation({ device: ["iphone"] }, "v2").planId, "year_v2");
  });

  it("recommends the middle plan otherwise", () => {
    assert.equal(getQuizRecommendation({ device: ["android"] }, "v1").planId, "6months");
    assert.equal(getQuizRecommendation({ device: ["android"] }, "v2").planId, "quarter_v2");
  });
});

describe("quiz copy", () => {
  it("names the picked apps", () => {
    assert.equal(listQuizApps({ apps: ["snap", "insta", "tinder"] }), "Snap, Instagram et Tinder");
    assert.equal(listQuizApps({ apps: ["other"] }), "tes apps");
    assert.equal(getMainQuizApp({ apps: ["other", "insta"] }), "Instagram");
    assert.equal(getMainQuizApp({ apps: ["other"] }), null);
  });

  it("builds the checklist from the answers", () => {
    const steps = getQuizFinalSteps(
      { apps: ["snap"], device: ["iphone"], computer: ["pc"], movement: ["walk"] },
      marbella
    );
    assert.deepEqual(steps, [
      "On place ta position à Puerto Banús",
      "On la connecte à Snap",
      "On trace tes balades à Marbella",
      "On prépare ton guide pour iPhone et PC",
      "Dernière vérification",
    ]);
  });
});

describe("onboarding experiment", () => {
  it("splits visitors in half", () => {
    assert.equal(pickOnboardingVariant(0.2), "control");
    assert.equal(pickOnboardingVariant(0.7), "app");
  });

  it("sends the app half to signup, then to the web remote", () => {
    assert.equal(getAppSignupUrl("annual"), "/signup?plan=annual&next=%2Fapp");
    assert.ok(isRemoteAppPath("/app"));
    assert.ok(!isRemoteAppPath("/application"));
  });

  it("still sends the quiz to signup first", () => {
    assert.equal(getQuizSignupUrl("annual"), "/signup?plan=annual&next=%2Fonboarding%2Fquiz%3Fplan%3Dannual");
    assert.ok(isOnboardingQuizPath("/onboarding/quiz?plan=annual"));
    assert.ok(!isOnboardingQuizPath("/onboarding"));
  });
});
