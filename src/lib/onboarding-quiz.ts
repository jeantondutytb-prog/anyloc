import { COMPARISON, DEVICE_REQUIREMENT_NOTE, getGridPlans, type PricingGrid } from "@/lib/constants";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";

/**
 * The questions of the quiz onboarding (see lib/onboarding-experiment), asked
 * while the visitor's position "gets ready". Every answer changes something
 * real: the setup guide, the apps named on the paywall, the recommended plan.
 */

/** Brand or neutral tile shown on an option (see components/onboarding/brand-logos). */
export type QuizIcon =
  | "snap"
  | "instagram"
  | "tinder"
  | "bumble"
  | "findmy"
  | "apple"
  | "android"
  | "mac"
  | "pc"
  | "other";

export type QuizOption = {
  id: string;
  label: string;
  icon?: QuizIcon;
  /** Shown under the cards once picked (single-choice questions only). */
  note?: string;
  soon?: boolean;
};

export type QuizAnswers = Record<string, string[]>;

export type QuizQuestion = {
  id: string;
  kicker: string;
  title: (city: string) => string;
  multi?: boolean;
  /** Only asked when this returns true (the computer question is iPhone-only). */
  when?: (answers: QuizAnswers) => boolean;
  /** Always 2, 3, 4 or 6 options, so the grid never leaves one card alone on a row. */
  options: QuizOption[];
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "apps",
    kicker: "Tes apps",
    title: (city) => `Sur quelles apps tu dois apparaître à ${city} ?`,
    multi: true,
    options: [
      { id: "snap", label: "Snap", icon: "snap" },
      { id: "insta", label: "Instagram", icon: "instagram" },
      { id: "tinder", label: "Tinder", icon: "tinder" },
      { id: "bumble", label: "Bumble", icon: "bumble" },
      { id: "findmy", label: "Localiser", icon: "findmy" },
      { id: "other", label: "Autre", icon: "other" },
    ],
  },
  {
    id: "audience",
    kicker: "Ton public",
    title: () => "Qui doit y croire ?",
    options: [
      { id: "friends", label: "Mes potes", note: "Ils verront ta position bouger en direct sur la carte." },
      { id: "ex", label: "Mon ex", note: "Ta position reste là-bas aussi longtemps que tu veux." },
      { id: "family", label: "Ma famille", note: "Toutes tes apps affichent la même ville : rien ne cloche." },
      { id: "matches", label: "Mes matchs", note: "Tu matches avec des gens de là-bas, comme si tu y étais." },
      { id: "followers", label: "Mes abonnés", note: "Tes stories et tes posts sont localisés là-bas." },
      { id: "other", label: "Autre", note: "Pas de souci, ta loc marche pour tout le monde." },
    ],
  },
  {
    id: "frequency",
    kicker: "Ton usage",
    title: () => "Tu changerais de position à quelle fréquence ?",
    options: [
      { id: "once", label: "Une fois, pour un coup", note: "Pratique pour un coup : tu la mets, et elle reste là." },
      { id: "sometimes", label: "De temps en temps", note: "Tu la changes quand l'envie te prend, depuis ton téléphone." },
      { id: "often", label: "Souvent", note: "Tu changes de ville quand tu veux, sans tout refaire." },
      { id: "always", label: "Tout le temps", note: "Elle reste active en arrière-plan, tu n'as rien à relancer." },
    ],
  },
  {
    id: "device",
    kicker: "Ton téléphone",
    title: () => "Tu as quel téléphone ?",
    options: [
      { id: "iphone", label: "iPhone", icon: "apple", note: "Ça marche sur tous les iPhone récents, sans rien modifier." },
      { id: "android", label: "Android", icon: "android", note: "Tout se fait directement sur ton téléphone." },
      { id: "other", label: "Autre", icon: "other", note: "On regarde avec toi si ton téléphone est compatible." },
    ],
  },
  {
    id: "computer",
    kicker: "Ton installation",
    title: () => "Tu as quel ordinateur ?",
    when: (answers) => answers.device?.[0] === "iphone",
    options: [
      { id: "mac", label: "Mac", icon: "mac", note: "On te prépare le guide pour Mac : 5 minutes, une seule fois." },
      { id: "pc", label: "PC", icon: "pc", note: "On te prépare le guide pour PC : 5 minutes, une seule fois." },
      { id: "other", label: "Autre", icon: "other", note: "On t'aide à trouver la bonne solution sur le chat." },
    ],
  },
  {
    id: "movement",
    kicker: "Ta position",
    title: () => "Tu veux que ta position bouge ?",
    options: [
      { id: "fixed", label: "Non, elle reste au même endroit", note: "Simple : ta position reste posée là où tu l'as mise." },
      { id: "walk", label: "Oui, je me balade à pied", note: "Ta position se déplace dans les rues, comme si tu marchais." },
      { id: "travel", label: "En voiture, train ou avion", soon: true, note: "Bientôt dispo : on te prévient dès que c'est prêt." },
    ],
  },
  {
    id: "tried",
    kicker: "Ton historique",
    title: () => "Tu as déjà essayé autre chose ?",
    options: [
      { id: "vpn", label: "Un VPN", note: "Un VPN ne change pas ton GPS : les apps le voient toujours." },
      { id: "fakegps", label: "Une app Fake GPS", note: "Ces apps ne changent pas ta position pour toutes les apps." },
      { id: "nothing", label: "Non, jamais", note: "Aucun souci : le guide te prend par la main." },
      { id: "other", label: "Autre chose", note: "Anyloc agit sur le GPS de tout ton téléphone." },
    ],
  },
  {
    id: "worry",
    kicker: "Ce qui te freine",
    title: () => "Qu'est-ce qui t'inquiète le plus ?",
    options: [
      { id: "detect", label: "Qu'on voie que c'est faux", note: "Tes potes voient une position normale, comme si tu y étais." },
      { id: "ban", label: "Me faire bannir", note: "Anyloc ne touche pas à tes apps : elles lisent juste ta position." },
      { id: "install", label: "L'installation", note: "Un guide pas à pas, et le chat t'aide en direct si tu bloques." },
      { id: "price", label: "Payer pour rien", note: "Si ça ne marche pas, ton 1er paiement est remboursé (garantie 48 h)." },
      { id: "none", label: "Rien, je veux tester", note: "Parfait : ta loc est presque prête." },
      { id: "other", label: "Autre", note: "Le chat répond à toutes tes questions, même avant de payer." },
    ],
  },
  {
    id: "timing",
    kicker: "Ton timing",
    title: () => "Tu en as besoin pour quand ?",
    options: [
      { id: "today", label: "Aujourd'hui", note: "L'installation prend 5 minutes, une seule fois." },
      { id: "week", label: "Cette semaine", note: "Tu as le temps : un guide pas à pas t'accompagne." },
      { id: "later", label: "Plus tard", note: "Aucune pression : ta loc sera prête quand tu le seras." },
    ],
  },
];

export type QuizFact = {
  id: "install" | "compare";
  /** The fact screen comes right after this question. */
  afterQuestionId: string;
  title: (answers: QuizAnswers) => string;
  body: (answers: QuizAnswers) => string;
};

/** "Modifie le GPS de tout le tel": the first row of the landing comparison. */
const GPS_ROW = COMPARISON[0].feature;

export const QUIZ_FACTS: QuizFact[] = [
  {
    id: "install",
    afterQuestionId: "device",
    title: () => "L'installation, c'est 5 minutes",
    body: () => `Un guide pas à pas, une seule fois. ${DEVICE_REQUIREMENT_NOTE}`,
  },
  {
    id: "compare",
    afterQuestionId: "tried",
    title: (answers) =>
      answers.tried?.[0] === "vpn"
        ? "Un VPN ne change pas ton GPS"
        : answers.tried?.[0] === "fakegps"
          ? "Une app Fake GPS ne suffit pas"
          : "Anyloc change ton GPS",
    body: (answers) =>
      answers.tried?.[0] === "vpn"
        ? "Un VPN change ton adresse IP, pas ton GPS. Les apps lisent le GPS : elles voient toujours où tu es vraiment."
        : answers.tried?.[0] === "fakegps"
          ? "Une app Fake GPS ne change pas la position vue par toutes les apps. Anyloc, si."
          : `${GPS_ROW} : Anyloc le fait, pas un VPN ni une app Fake GPS.`,
  },
];

export type QuizStep =
  | { kind: "question"; question: QuizQuestion }
  | { kind: "fact"; fact: QuizFact };

/** The asked questions, each followed by the fact screen attached to it, if any. */
export function getQuizSequence(answers: QuizAnswers): QuizStep[] {
  const asked = getAskedQuestions(answers);
  // The install fact follows the last of device/computer that is asked.
  const installAnchor = asked.findLast((q) => q.id === "device" || q.id === "computer")?.id;
  return asked.flatMap((question): QuizStep[] => [
    { kind: "question", question },
    ...QUIZ_FACTS.filter(
      (fact) =>
        (fact.afterQuestionId === "device" ? installAnchor : fact.afterQuestionId) === question.id
    ).map((fact): QuizStep => ({ kind: "fact", fact })),
  ]);
}

/** One calm line on the ready screen, adapted to when the position is needed. */
export function getQuizTimingLine(answers: QuizAnswers): string | null {
  switch (answers.timing?.[0]) {
    case "today":
      return "Pour aujourd'hui, c'est jouable : l'installation prend 5 minutes.";
    case "week":
      return "Tu as la semaine devant toi : prends ton temps, le guide t'accompagne.";
    case "later":
      return "Aucune pression : ta loc t'attend quand tu seras prêt.";
    default:
      return null;
  }
}

const APP_LABELS: Record<string, string> = {
  snap: "Snap",
  insta: "Instagram",
  tinder: "Tinder",
  bumble: "Bumble",
  findmy: "Localiser",
};

export function getAskedQuestions(answers: QuizAnswers) {
  return QUIZ_QUESTIONS.filter((question) => !question.when || question.when(answers));
}

/** "Snap, Instagram et Tinder", or "tes apps" when only "Autre" was picked. */
export function listQuizApps(answers: QuizAnswers) {
  const apps = (answers.apps ?? []).map((id) => APP_LABELS[id]).filter(Boolean);
  if (apps.length <= 1) return apps[0] ?? "tes apps";
  return `${apps.slice(0, -1).join(", ")} et ${apps.at(-1)}`;
}

/** The first named app picked, for the paywall headline ("… sur Snap"). */
export function getMainQuizApp(answers: QuizAnswers) {
  const id = (answers.apps ?? []).find((app) => APP_LABELS[app]);
  return id ? APP_LABELS[id] : null;
}

/** The "finalising" checklist: each line is something the answers set up. */
export function getQuizFinalSteps(answers: QuizAnswers, destination: OnboardingDestination) {
  const device = answers.device?.[0];
  const computer = answers.computer?.[0];
  const guide =
    device === "android"
      ? "On prépare ton guide pour Android"
      : device === "iphone" && computer === "mac"
        ? "On prépare ton guide pour iPhone et Mac"
        : device === "iphone" && computer === "pc"
          ? "On prépare ton guide pour iPhone et PC"
          : "On prépare ton guide d'installation";
  return [
    `On place ta position à ${destination.area || destination.city}`,
    `On la connecte à ${listQuizApps(answers)}`,
    answers.movement?.[0] === "walk" ? `On trace tes balades à ${destination.city}` : "On fixe ta position",
    guide,
    "Dernière vérification",
  ];
}

export type QuizRecommendation = { planId: string; reason: string };

/**
 * Always the plan of the visitor's price grid that includes the mobile app
 * (the annual one); only the reason changes with the answers.
 */
export function getQuizRecommendation(answers: QuizAnswers, grid: PricingGrid): QuizRecommendation {
  const plans = getGridPlans(grid);
  const plan = plans.find((candidate) => candidate.mobileApp) ?? plans[plans.length - 1];
  if (answers.device?.[0] === "iphone") {
    return { planId: plan.id, reason: "App iPhone incluse : tu changes de ville depuis ton tel" };
  }
  const frequency = answers.frequency?.[0];
  if (frequency === "often" || frequency === "always") {
    return { planId: plan.id, reason: "Tu t'en sers souvent : c'est la formule la moins chère au mois" };
  }
  return { planId: plan.id, reason: "Le meilleur prix au mois, app mobile incluse" };
}

/** What the quiz hands over to the checkout, through sessionStorage. */
export type QuizResult = {
  recommendedPlanId: string;
  reason: string;
  mainApp: string | null;
};

export const QUIZ_RESULT_KEY = "anyloc-onboarding-quiz-result";

export function readQuizResult(): QuizResult | null {
  try {
    const stored = window.sessionStorage.getItem(QUIZ_RESULT_KEY);
    return stored ? (JSON.parse(stored) as QuizResult) : null;
  } catch {
    return null;
  }
}

export function storeQuizResult(result: QuizResult) {
  try {
    window.sessionStorage.setItem(QUIZ_RESULT_KEY, JSON.stringify(result));
  } catch {}
}
