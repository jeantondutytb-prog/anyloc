import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAskedQuestions,
  cleanOtherApp,
  getQuizAppChips,
  getMainQuizApp,
  OTHER_APP_MAX_LENGTH,
  getQuizFinalSteps,
  getQuizRecommendation,
  getQuizSequence,
  getQuizTimingLine,
  listQuizApps,
  QUIZ_FACTS,
  QUIZ_QUESTIONS,
  type QuizAnswers,
} from "./onboarding-quiz";
import { atCity, atPlace, parseStoredDestination, TRENDING_DESTINATIONS, ALL_ONBOARDING_DESTINATIONS } from "./onboarding-destinations";
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
  at: "à Puerto Banús",
};

describe("quiz questions", () => {
  it("asks about the apps people really fake on", () => {
    const apps = QUIZ_QUESTIONS.find((q) => q.id === "apps")!;
    assert.deepEqual(
      apps.options.map((option) => option.id),
      ["snap", "findmy", "insta", "life360", "gmaps", "other"]
    );
    assert.deepEqual(
      apps.options.map((option) => option.icon),
      ["snap", "findmy", "instagram", "life360", "gmaps", "other"]
    );
  });

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
      "apps", "audience", "frequency", "device",
      "movement", "tried", "fact:compare", "worry", "timing",
    ]);
  });

  it("asks the computer question after the phone on iPhone", () => {
    const kinds = getQuizSequence({ device: ["iphone"] }).map((s) =>
      s.kind === "question" ? s.question.id : `fact:${s.fact.id}`
    );
    assert.deepEqual(kinds, [
      "apps", "audience", "frequency", "device", "computer",
      "movement", "tried", "fact:compare", "worry", "timing",
    ]);
  });

  it("has no install fact", () => {
    assert.deepEqual(QUIZ_FACTS.map((fact) => fact.id), ["compare"]);
  });

  it("tailors the comparison to what was tried, a VPN first, then Fake GPS", () => {
    const compare = QUIZ_FACTS.find((fact) => fact.id === "compare")!;
    const vpn = compare.title({ tried: ["vpn"] });
    const fake = compare.title({ tried: ["fakegps"] });
    const fallback = compare.title({ tried: ["nothing"] });
    assert.match(vpn, /VPN/);
    assert.match(fake, /Fake GPS/);
    assert.equal(fallback, "Anyloc change le GPS de tout ton tel");
    assert.equal(compare.body({ tried: ["fakegps", "vpn"] }), compare.body({ tried: ["vpn"] }));
    assert.equal(compare.title({ tried: ["other", "fakegps"] }), fake);
    assert.equal(compare.title({ tried: ["nothing", "other"] }), fallback);
    assert.equal(compare.title({}), fallback);
    assert.match(compare.body({}), /Toutes tes apps/);
  });

  it("lets the audience and what was tried be multi-select", () => {
    for (const id of ["apps", "audience", "tried"]) {
      assert.equal(QUIZ_QUESTIONS.find((q) => q.id === id)?.multi, true, id);
    }
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
    assert.equal(getQuizRecommendation({ device: ["iphone"], frequency: ["often"] }, "v1").reason, "App iPhone incluse");
    assert.equal(getQuizRecommendation({ frequency: ["often"] }, "v1").reason, "La moins chère au mois");
    assert.equal(getQuizRecommendation({ frequency: ["always"] }, "v1").reason, "La moins chère au mois");
    assert.equal(getQuizRecommendation({ frequency: ["once"] }, "v1").reason, "Le meilleur prix au mois");
  });

  it("keeps the reason to one short line", () => {
    for (const answers of [{ device: ["iphone"] }, { frequency: ["often"] }, {}] as QuizAnswers[]) {
      assert.ok(getQuizRecommendation(answers, "v1").reason.length <= 30);
    }
  });
});

describe("quiz copy", () => {
  it("names the picked apps", () => {
    assert.equal(listQuizApps({ apps: ["snap", "insta", "gmaps"] }), "Snap, Instagram et Google Maps");
    assert.equal(listQuizApps({ apps: ["findmy", "life360"] }), "Localiser et Life360");
    assert.equal(listQuizApps({ apps: ["other"] }), "tes apps");
    assert.equal(getMainQuizApp({ apps: ["gmaps"] }), "Google Maps");
    assert.equal(getMainQuizApp({ apps: ["life360"] }), "Life360");
    assert.equal(getMainQuizApp({ apps: ["other", "insta"] }), "Instagram");
    assert.equal(getMainQuizApp({ apps: ["other"] }), null);
  });

  it("names the free-text app typed for Autre, only while Autre is picked", () => {
    assert.equal(listQuizApps({ apps: ["other"] }, "  Tinder "), "Tinder");
    assert.equal(listQuizApps({ apps: ["snap", "other"] }, "Tinder"), "Snap et Tinder");
    assert.equal(listQuizApps({ apps: ["snap", "insta", "other"] }, "Tinder"), "Snap, Instagram et Tinder");
    assert.equal(listQuizApps({ apps: ["snap"] }, "Tinder"), "Snap");
    assert.equal(listQuizApps({ apps: ["other"] }, "   "), "tes apps");
    assert.equal(getMainQuizApp({ apps: ["other"] }, "Tinder"), "Tinder");
    assert.equal(getMainQuizApp({ apps: ["insta", "other"] }, "Tinder"), "Instagram");
    assert.equal(getMainQuizApp({ apps: ["snap"] }, "Tinder"), "Snap");
  });

  it("gives short chips for the picked apps", () => {
    assert.deepEqual(getQuizAppChips({ apps: ["snap", "insta", "gmaps", "findmy"] }), ["Snap", "Insta", "Maps", "Localiser"]);
    assert.deepEqual(getQuizAppChips({ apps: ["snap", "other"] }, "Tinder"), ["Snap", "Tinder"]);
    assert.deepEqual(getQuizAppChips({ apps: ["other"] }), []);
    assert.deepEqual(getQuizAppChips({}), []);
  });

  it("cleans and caps the free-text app", () => {
    assert.equal(cleanOtherApp("  Be   Real  "), "Be Real");
    assert.equal(cleanOtherApp(undefined), "");
    assert.equal(cleanOtherApp("x".repeat(60)).length, OTHER_APP_MAX_LENGTH);
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

describe("place articles", () => {
  it("puts the article before a curated spot", () => {
    const eiffel = ALL_ONBOARDING_DESTINATIONS.find((d) => d.id === "Paris — Tour Eiffel")!;
    const strip = ALL_ONBOARDING_DESTINATIONS.find((d) => d.id === "Las Vegas — Strip")!;
    assert.equal(atPlace(eiffel), "à la Tour Eiffel");
    assert.equal(atPlace(strip), "sur le Strip");
    assert.match(getQuizFinalSteps({}, eiffel)[0], /^On place ta position à la Tour Eiffel$/);
  });

  it("gives every curated spot a phrase", () => {
    for (const destination of ALL_ONBOARDING_DESTINATIONS) {
      assert.ok(destination.at, destination.id);
    }
    assert.equal(TRENDING_DESTINATIONS.length, 12);
  });

  it("falls back to the city when the spot has no phrase", () => {
    assert.equal(atPlace({ city: "Lisbonne" }), "à Lisbonne");
    assert.equal(
      getQuizFinalSteps({}, { id: "x", city: "Le Caire", area: "", emoji: "📍", lat: 1, lng: 1 })[0],
      "On place ta position au Caire"
    );
  });

  it("contracts the article of a city", () => {
    assert.equal(atCity("Marbella"), "à Marbella");
    assert.equal(atCity("Le Caire"), "au Caire");
    assert.equal(atCity("Les Sables-d'Olonne"), "aux Sables-d'Olonne");
    assert.equal(atCity("La Havane"), "à la Havane");
    assert.equal(atCity("L'Alpe d'Huez"), "à l'Alpe d'Huez");
  });

  it("uses the city article in the question title", () => {
    assert.match(QUIZ_QUESTIONS[0].title("Le Caire"), /apparaître au Caire/);
  });
});

describe("French typography", () => {
  it("never leaves a regular space before ? ! or :", () => {
    const bad = / [?!:]/;
    const strings: string[] = [];
    const everyAnswer: QuizAnswers = {
      apps: ["snap"], device: ["iphone"], computer: ["mac"], movement: ["walk"],
      timing: ["today"], frequency: ["often"], tried: ["vpn"],
    };
    for (const question of QUIZ_QUESTIONS) {
      strings.push(question.title("Paris"), question.title("Le Caire"));
      for (const option of question.options) strings.push(option.label, option.note ?? "");
    }
    for (const fact of QUIZ_FACTS) {
      for (const tried of [["vpn"], ["fakegps"], ["nothing"], []]) {
        strings.push(fact.title({ tried }), fact.body({ tried }));
      }
    }
    for (const timing of ["today", "week", "later"]) strings.push(getQuizTimingLine({ timing: [timing] }) ?? "");
    strings.push(...getQuizFinalSteps(everyAnswer, marbella));
    for (const answers of [everyAnswer, { frequency: ["once"] }, { device: ["android"] }]) {
      strings.push(getQuizRecommendation(answers, "v1").reason, getQuizRecommendation(answers, "v2").reason);
    }
    for (const text of strings) assert.ok(!bad.test(text), text);
    assert.ok(strings.some((text) => text.includes("\u00A0?")));
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
