import { getGridPlans, type PricingGrid } from "@/lib/constants";
import { atCity, atPlace, type OnboardingDestination } from "@/lib/onboarding-destinations";

/**
 * The questions of the quiz onboarding (see lib/onboarding-experiment), asked
 * while the visitor's position "gets ready". Every answer changes something
 * real: the setup guide, the apps named on the paywall, the recommended plan.
 */

/** Brand or neutral tile shown on an option (see components/onboarding/brand-logos). */
export type QuizIcon =
  | "snap"
  | "instagram"
  | "life360"
  | "gmaps"
  | "findmy"
  | "apple"
  | "android"
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
  /** Only asked when this returns true (for conditional questions). */
  when?: (answers: QuizAnswers) => boolean;
  /** Always 2, 3, 4 or 6 options, so the grid never leaves one card alone on a row. */
  options: QuizOption[];
};

/**
 * French typography wants a no-break space before ? ! and :, so the mark never
 * wraps alone onto its own line. Every string the quiz shows goes through this.
 */
export function nbsp(text: string) {
  return text.replace(/ ([?!:])/g, "\u00A0$1");
}

const RAW_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "apps",
    kicker: "Tes apps",
    title: (city) => `Sur quelles apps tu dois apparaître ${atCity(city)} ?`,
    multi: true,
    options: [
      { id: "snap", label: "Snap", icon: "snap" },
      { id: "findmy", label: "Localiser", icon: "findmy" },
      { id: "insta", label: "Instagram", icon: "instagram" },
      { id: "life360", label: "Life360", icon: "life360" },
      { id: "gmaps", label: "Google Maps", icon: "gmaps" },
      { id: "other", label: "Autre", icon: "other" },
    ],
  },
  {
    id: "audience",
    kicker: "Ton public",
    title: () => "Qui doit y croire ?",
    multi: true,
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
    multi: true,
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
  id: "compare";
  /** The fact screen comes right after this question. */
  afterQuestionId: string;
  title: (answers: QuizAnswers) => string;
  body: (answers: QuizAnswers) => string;
};

/** Which version of the comparison to show: a VPN wins over a Fake GPS app, then the default. */
function comparisonKind(answers: QuizAnswers): "vpn" | "fakegps" | "default" {
  const tried = answers.tried ?? [];
  if (tried.includes("vpn")) return "vpn";
  if (tried.includes("fakegps")) return "fakegps";
  return "default";
}

const RAW_QUIZ_FACTS: QuizFact[] = [
  {
    id: "compare",
    afterQuestionId: "tried",
    title: (answers) => {
      switch (comparisonKind(answers)) {
        case "vpn":
          return "Un VPN ne change pas ton GPS";
        case "fakegps":
          return "Une app Fake GPS ne suffit pas";
        default:
          return "Anyloc change le GPS de tout ton tel";
      }
    },
    body: (answers) => {
      switch (comparisonKind(answers)) {
        case "vpn":
          return "Un VPN change ton adresse IP, pas ton GPS. Les apps lisent le GPS : elles voient toujours où tu es vraiment.";
        case "fakegps":
          return "Une app Fake GPS ne change pas la position vue par toutes les apps. Anyloc, si.";
        default:
          return "Toutes tes apps voient ta nouvelle position, pas seulement une.";
      }
    },
  },
];

export const QUIZ_FACTS: QuizFact[] = RAW_QUIZ_FACTS.map((fact) => ({
  ...fact,
  title: (answers) => nbsp(fact.title(answers)),
  body: (answers) => nbsp(fact.body(answers)),
}));

export const QUIZ_QUESTIONS: QuizQuestion[] = RAW_QUIZ_QUESTIONS.map((question) => ({
  ...question,
  title: (city) => nbsp(question.title(city)),
  options: question.options.map((option) => ({
    ...option,
    label: nbsp(option.label),
    note: option.note === undefined ? undefined : nbsp(option.note),
  })),
}));

export type QuizStep =
  | { kind: "question"; question: QuizQuestion }
  | { kind: "fact"; fact: QuizFact };

/** The asked questions, each followed by the fact screen attached to it, if any. */
export function getQuizSequence(answers: QuizAnswers): QuizStep[] {
  return getAskedQuestions(answers).flatMap((question): QuizStep[] => [
    { kind: "question", question },
    ...QUIZ_FACTS.filter((fact) => fact.afterQuestionId === question.id).map(
      (fact): QuizStep => ({ kind: "fact", fact })
    ),
  ]);
}

/** One calm line on the ready screen, adapted to when the position is needed. */
export function getQuizTimingLine(answers: QuizAnswers): string | null {
  switch (answers.timing?.[0]) {
    case "today":
      return nbsp("Pour aujourd'hui, c'est jouable : l'installation prend 5 minutes.");
    case "week":
      return nbsp("Tu as la semaine devant toi : prends ton temps, le guide t'accompagne.");
    case "later":
      return nbsp("Aucune pression : ta loc t'attend quand tu seras prêt.");
    default:
      return null;
  }
}

const APP_LABELS: Record<string, string> = {
  snap: "Snap",
  insta: "Instagram",
  findmy: "Localiser",
  life360: "Life360",
  gmaps: "Google Maps",
};

export function getAskedQuestions(answers: QuizAnswers) {
  return QUIZ_QUESTIONS.filter((question) => !question.when || question.when(answers));
}

export const OTHER_APP_MAX_LENGTH = 40;

/** What the visitor typed for "Autre" in the apps question: trimmed, spaces collapsed, capped. */
export function cleanOtherApp(text: string | undefined) {
  return (text ?? "").replace(/\s+/g, " ").trim().slice(0, OTHER_APP_MAX_LENGTH);
}

/** The apps named by the visitor, in order; the free-text "Autre" app comes last, only if "Autre" is picked. */
function namedApps(answers: QuizAnswers, otherApp?: string) {
  const picked = answers.apps ?? [];
  const apps = picked.map((id) => APP_LABELS[id]).filter(Boolean);
  const other = picked.includes("other") ? cleanOtherApp(otherApp) : "";
  return other ? [...apps, other] : apps;
}

/**
 * "Snap, Instagram et Google Maps", or "tes apps" when nothing is named
 * (only "Autre" picked without typing the app).
 */
export function listQuizApps(answers: QuizAnswers, otherApp?: string) {
  const apps = namedApps(answers, otherApp);
  if (apps.length <= 1) return apps[0] ?? "tes apps";
  return `${apps.slice(0, -1).join(", ")} et ${apps.at(-1)}`;
}

const APP_CHIPS: Record<string, string> = { ...APP_LABELS, insta: "Insta", gmaps: "Maps" };

/** Short chip labels of the picked apps, for the phone mock-up; empty when none is named. */
export function getQuizAppChips(answers: QuizAnswers, otherApp?: string) {
  const picked = answers.apps ?? [];
  const chips = picked.map((id) => APP_CHIPS[id]).filter(Boolean);
  const other = picked.includes("other") ? cleanOtherApp(otherApp) : "";
  return other ? [...chips, other] : chips;
}

/** The first named app picked, for the paywall headline ("… sur Snap"). */
export function getMainQuizApp(answers: QuizAnswers, otherApp?: string) {
  return namedApps(answers, otherApp)[0] ?? null;
}

/** The "finalising" checklist: each line is something the answers set up. */
export function getQuizFinalSteps(answers: QuizAnswers, destination: OnboardingDestination, otherApp?: string) {
  const device = answers.device?.[0];
  const guide =
    device === "android"
      ? "On prépare ton guide pour Android"
      : device === "iphone"
        ? "On prépare ton guide pour iPhone"
        : "On prépare ton guide d'installation";
  return [
    `On place ta position ${atPlace(destination)}`,
    `On la connecte à ${listQuizApps(answers, otherApp)}`,
    answers.movement?.[0] === "walk" ? `On trace tes balades ${atCity(destination.city)}` : "On fixe ta position",
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
    return { planId: plan.id, reason: "App iPhone incluse" };
  }
  const frequency = answers.frequency?.[0];
  if (frequency === "often" || frequency === "always") {
    return { planId: plan.id, reason: "La moins chère au mois" };
  }
  return { planId: plan.id, reason: "Le meilleur prix au mois" };
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
