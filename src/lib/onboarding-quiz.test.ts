import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAskedQuestions,
  getMainQuizApp,
  getQuizFinalSteps,
  getQuizRecommendation,
  getQuizSequence,
  getQuizTimingLine,
  listQuizApps,
  QUIZ_FACTS,
  QUIZ_QUESTIONS,
} from "./onboarding-quiz";
import { parseStoredDestination } from "./onboarding-destinations";
import {
  getAppSignupUrl,
  getQuizSignupUrl,
  getSignupUrlForOnboardingVariant,
  isOnboardingQuizPath,
  isRemoteAppPath,
  parseOnboardingVariant,
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

describe("quiz sequence", () => {
  it("puts each fact right after its question", () => {
    const kinds = getQuizSequence({ device: ["android"] }).map((s) =>
      s.kind === "question" ? s.question.id : `fact:${s.fact.id}`
    );
    assert.deepEqual(kinds, [
      "apps", "audience", "frequency", "device", "fact:install",
      "movement", "tried", "fact:compare", "worry", "timing",
    ]);
  });

  it("puts the install fact after the computer question on iPhone", () => {
    const kinds = getQuizSequence({ device: ["iphone"] }).map((s) =>
      s.kind === "question" ? s.question.id : `fact:${s.fact.id}`
    );
    assert.deepEqual(kinds, [
      "apps", "audience", "frequency", "device", "computer", "fact:install",
      "movement", "tried", "fact:compare", "worry", "timing",
    ]);
  });

  it("tailors the comparison to what was tried", () => {
    const compare = QUIZ_FACTS.find((fact) => fact.id === "compare")!;
    assert.match(compare.body({ tried: ["vpn"] }), /VPN/);
    assert.notEqual(compare.body({ tried: ["vpn"] }), compare.body({ tried: ["fakegps"] }));
  });
});

describe("getQuizRecommendation", () => {
  it("recommends the plan with the iPhone app to iPhone users, in either grid", () => {
    assert.equal(getQuizRecommendation({ device: ["iphone"] }, "v1").planId, "annual");
    assert.equal(getQuizRecommendation({ device: ["iphone"] }, "v2").planId, "year_v2");
  });

  it("recommends the plan with the mobile app otherwise", () => {
    assert.equal(getQuizRecommendation({ device: ["android"] }, "v1").planId, "annual");
    assert.equal(getQuizRecommendation({ device: ["android"] }, "v2").planId, "year_v2");
  });

  it("explains the choice by how often the position is used", () => {
    assert.match(getQuizRecommendation({ frequency: ["often"] }, "v1").reason, /souvent/);
    assert.match(getQuizRecommendation({ frequency: ["once"] }, "v1").reason, /meilleur prix/);
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

describe("timing line", () => {
  it("adapts to when the position is needed", () => {
    assert.match(getQuizTimingLine({ timing: ["today"] })!, /aujourd'hui/);
    assert.match(getQuizTimingLine({ timing: ["today"] })!, /5 minutes/);
    assert.notEqual(getQuizTimingLine({ timing: ["week"] }), getQuizTimingLine({ timing: ["later"] }));
    assert.equal(getQuizTimingLine({}), null);
  });
});

describe("stored destination", () => {
  it("only resumes a well-formed stored destination", () => {
    assert.deepEqual(parseStoredDestination(JSON.stringify(marbella)), marbella);
    assert.equal(parseStoredDestination(null), null);
    assert.equal(parseStoredDestination("{oops"), null);
    assert.equal(parseStoredDestination(JSON.stringify({ city: "Paris" })), null);
  });
});

describe("onboarding experiment", () => {
  it("redraws visitors from retired variants", () => {
    assert.equal(parseOnboardingVariant("app"), null);
    assert.equal(parseOnboardingVariant("quiz"), null);
    assert.equal(pickOnboardingVariant(0.2), "control");
    assert.equal(pickOnboardingVariant(0.7), "questions");
  });

  it("sends the questions half to the quiz after signup", () => {
    assert.equal(
      getSignupUrlForOnboardingVariant("questions", "annual"),
      "/signup?plan=annual&next=%2Fonboarding%2Fquiz%3Fplan%3Dannual"
    );
    assert.equal(
      getSignupUrlForOnboardingVariant("control", "annual"),
      "/signup?plan=annual&next=%2Fcheckout%3Fplan%3Dannual"
    );
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
