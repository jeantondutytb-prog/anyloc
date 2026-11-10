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
  /** Shown in the card under the options once picked (the last pick, for multi-select). */
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
      { id: "snap", label: "Snap", icon: "snap", note: "Ton Bitmoji apparaît là-bas sur la Snap Map." },
      { id: "findmy", label: "Localiser", icon: "findmy", note: "Tes proches te voient là-bas dans Localiser." },
      { id: "insta", label: "Instagram", icon: "instagram", note: "Tes stories et tes posts sont localisés là-bas." },
      { id: "life360", label: "Life360", icon: "life360", note: "Ton cercle Life360 te voit là-bas." },
      { id: "gmaps", label: "Google Maps", icon: "gmaps", note: "Google Maps te place exactement là-bas." },
      { id: "other", label: "Autre", icon: "other", note: "Anyloc change le GPS de tout ton tel : toutes tes apps suivent." },
    ],
  },
  {
    id: "audience",
    kicker: "Ton public",
    title: () => "Qui doit y croire ?",
    multi: true,
    options: [
      { id: "friends", label: "Mes potes", note: "Tes potes te voient bouger en direct sur la carte." },
      { id: "ex", label: "Mon ex", note: "Ta position reste là-bas aussi longtemps que tu veux." },
      { id: "family", label: "Ma famille", note: "Toutes tes apps affichent la même ville : rien ne cloche." },
      { id: "matches", label: "Mes matchs", note: "Tu matches avec des gens de là-bas, comme si tu y étais." },
      { id: "followers", label: "Mes abonnés", note: "Tes stories et tes posts sont localisés là-bas." },
      { id: "other", label: "Autre", note: "Ta loc marche pour tout le monde, sans exception." },
    ],
  },
  {
    id: "frequency",
    kicker: "Ton usage",
    title: () => "Tu changerais de position à quelle fréquence ?",
    options: [
      { id: "once", label: "Juste une fois", note: "Tu la poses, elle reste là. Rien d'autre à faire." },
      { id: "sometimes", label: "De temps en temps", note: "Tu changes de ville quand tu veux, depuis ton tel." },
      { id: "often", label: "Souvent", note: "Change de ville autant que tu veux : c'est illimité." },
      { id: "always", label: "Tout le temps", note: "Elle reste active en arrière-plan, rien à relancer." },
    ],
  },
  {
    id: "device",
    kicker: "Ton téléphone",
    title: () => "Tu as quel téléphone ?",
    options: [
      { id: "iphone", label: "iPhone", icon: "apple", note: "Marche sur les iPhone récents, sans rien modifier." },
      { id: "android", label: "Android", icon: "android", note: "Tout se fait directement depuis ton tel." },
      { id: "other", label: "Autre", icon: "other", note: "On vérifie avec toi que ton tel est compatible." },
    ],
  },
  {
    id: "movement",
    kicker: "Ta position",
    title: () => "Tu veux que ta position bouge ?",
    options: [
      { id: "fixed", label: "Non, elle reste au même endroit", note: "Ta position reste posée là où tu l'as mise." },
      { id: "walk", label: "Oui, je me balade à pied", note: "Ta position avance dans les rues, comme si tu marchais." },
      { id: "travel", label: "En voiture, train ou avion", soon: true, note: "Bientôt dispo : on te prévient dès que c'est prêt." },
    ],
  },
  {
    id: "tried",
    kicker: "Ton expérience",
    title: () => "Tu as déjà essayé autre chose ?",
    multi: true,
    options: [
      { id: "vpn", label: "Un VPN", note: "Un VPN change ton IP, pas ton GPS : les apps te voient toujours." },
      { id: "fakegps", label: "Une app Fake GPS", note: "Une app Fake GPS ne trompe pas toutes tes apps. Anyloc, si." },
      { id: "nothing", label: "Non, jamais", note: "Aucun souci : le guide te prend par la main." },
      { id: "other", label: "Autre chose", note: "Anyloc change le GPS de tout ton tel, pas d'une seule app." },
    ],
  },
  {
    id: "worry",
    kicker: "Ce qui te freine",
    title: () => "Qu'est-ce qui t'inquiète le plus ?",
    options: [
      { id: "detect", label: "Qu'on voie que c'est faux", note: "Pour tes potes, c'est une position normale." },
      { id: "ban", label: "Me faire bannir", note: "Anyloc ne touche pas à tes apps : elles lisent juste ta position." },
      { id: "install", label: "L'installation", note: "Un guide pas à pas, et le chat t'aide en direct si tu bloques." },
      { id: "price", label: "Payer pour rien", note: "Si ça ne marche pas, ton 1er paiement est remboursé." },
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
      { id: "week", label: "Cette semaine", note: "Tu as le temps : le guide t'accompagne pas à pas." },
      { id: "later", label: "Plus tard", note: "Aucune pression : ta loc t'attend." },
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

/** Whole "On finalise ta loc" screen, last line and final hold included: under 3 s. */
export const FINALIZING_TOTAL_MS = 2700;
const FINALIZING_HOLD_MS = 300;

/**
 * Pace of the finalising screen: each checklist line gets an equal share of
 * the time left after the final hold, so 3 or 6 lines both end under 3 s.
 * The percent climbs by uneven steps (big first, small last) from where the
 * questions left the pill to 100 %.
 */
export function getFinalizingTimeline(stepCount: number, startPercent: number) {
  const count = Math.max(1, stepCount);
  const stepMs = Math.floor((FINALIZING_TOTAL_MS - FINALIZING_HOLD_MS) / count);
  const weights = Array.from({ length: count }, (_, index) => count - index + 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const start = Math.round(startPercent);
  let reached = 0;
  const percents = [start];
  for (const weight of weights) {
    reached += weight;
    percents.push(Math.round(start + ((100 - start) * reached) / total));
  }
  return { stepMs, holdMs: FINALIZING_HOLD_MS, percents };
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
 * The plan follows how often the position is used: once -> the shortest plan,
 * sometimes -> the middle one, often/always -> the plan with the mobile app.
 * Without a frequency, the mobile-app plan, with a reason that depends on the
 * device. Frequency wins over device.
 */
export function getQuizRecommendation(answers: QuizAnswers, grid: PricingGrid): QuizRecommendation {
  const plans = getGridPlans(grid);
  const appPlan = plans.find((candidate) => candidate.mobileApp) ?? plans[plans.length - 1];
  switch (answers.frequency?.[0]) {
    case "once":
      return { planId: plans[0].id, reason: "Parfait pour un coup" };
    case "sometimes":
      return { planId: plans[Math.floor((plans.length - 1) / 2)].id, reason: "Le bon équilibre" };
    case "often":
    case "always":
      return { planId: appPlan.id, reason: "La moins chère au mois" };
    default:
      return {
        planId: appPlan.id,
        reason: answers.device?.[0] === "iphone" ? "App iPhone incluse" : "Le meilleur prix au mois",
      };
  }
}

const AUDIENCE_LABELS: Record<string, string> = {
  friends: "tes potes",
  ex: "ton ex",
  family: "ta famille",
  matches: "tes matchs",
  followers: "tes abonnés",
};

/** « Visible par tes potes sur Snap dès que tu l'actives. » (first audience picked); no « par … » for Autre or nothing. */
export function getQuizVisibleLine(answers: QuizAnswers, otherApp?: string) {
  const who = (answers.audience ?? []).map((id) => AUDIENCE_LABELS[id]).find(Boolean);
  const apps = listQuizApps(answers, otherApp);
  return nbsp(`Visible${who ? ` par ${who}` : ""} sur ${apps} dès que tu l'actives.`);
}

const WORRY_REASSURANCES: Record<string, string> = {
  detect: "Pour tes potes, c'est une position normale.",
  ban: "Anyloc ne touche pas à tes apps.",
  install: "Le chat t'aide en direct si tu bloques.",
  price: "Si ça ne marche pas, ton 1er paiement est remboursé.",
};

/** One reassurance line for the paywall, from the visitor's biggest worry; null for none, Autre or unknown. */
export function getWorryReassurance(worry: string | null | undefined): string | null {
  const line = worry ? WORRY_REASSURANCES[worry] : undefined;
  return line ? nbsp(line) : null;
}

/** What the quiz hands over to the checkout, through sessionStorage. */
export type QuizResult = {
  recommendedPlanId: string;
  reason: string;
  mainApp: string | null;
  /** The worry picked in the quiz (older stored results have none). */
  worry?: string;
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
