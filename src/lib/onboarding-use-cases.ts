export type OnboardingUseCaseId =
  | "snap"
  | "instagram"
  | "tinder"
  | "games"
  | "life360"
  | "other";

export type OnboardingUseCase = {
  id: OnboardingUseCaseId;
  label: string;
  appName: string;
  emoji: string;
  description: string;
  pinColor: string;
  mapLabel: string;
};

export const ONBOARDING_USE_CASES: OnboardingUseCase[] = [
  {
    id: "snap",
    label: "Snap Map",
    appName: "Snapchat",
    emoji: "👻",
    description: "Fais croire à tes potes que t'es ailleurs sur la map",
    pinColor: "text-yellow-500",
    mapLabel: "SNAP MAP",
  },
  {
    id: "instagram",
    label: "Instagram",
    appName: "Instagram",
    emoji: "📸",
    description: "Stories et géoloc depuis n'importe quelle ville",
    pinColor: "text-pink-500",
    mapLabel: "INSTAGRAM",
  },
  {
    id: "tinder",
    label: "Apps de rencontre",
    appName: "Tinder / Bumble",
    emoji: "💘",
    description: "Swipe depuis Miami alors que t'es chez toi",
    pinColor: "text-rose-500",
    mapLabel: "TINDER",
  },
  {
    id: "games",
    label: "Jeux GPS",
    appName: "Pokémon GO & co",
    emoji: "🎮",
    description: "Joue depuis Tokyo sans bouger de chez toi",
    pinColor: "text-violet-500",
    mapLabel: "JEUX GPS",
  },
  {
    id: "life360",
    label: "Life360 / famille",
    appName: "Life360",
    emoji: "🛡️",
    description: "Contrôle ce que ta famille voit sur ta position",
    pinColor: "text-emerald-500",
    mapLabel: "LIFE360",
  },
  {
    id: "other",
    label: "Autre app",
    appName: "Toutes tes apps",
    emoji: "📍",
    description: "Un seul réglage GPS pour tout ton téléphone",
    pinColor: "text-pink-500",
    mapLabel: "GPS SYSTÈME",
  },
];

export const ONBOARDING_USE_CASE_KEY = "anyloc-onboarding-use-case";

export const DEFAULT_USE_CASE_ID: OnboardingUseCaseId = "snap";

export function isValidUseCaseId(
  value: string | undefined
): value is OnboardingUseCaseId {
  return ONBOARDING_USE_CASES.some((useCase) => useCase.id === value);
}

export function getUseCaseById(id: OnboardingUseCaseId): OnboardingUseCase {
  return (
    ONBOARDING_USE_CASES.find((useCase) => useCase.id === id) ??
    ONBOARDING_USE_CASES[0]
  );
}
