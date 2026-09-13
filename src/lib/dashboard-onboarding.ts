export const ONBOARDING_STORAGE_KEY = "anyloc-dashboard-onboarding";
export const PAYMENT_SUCCESS_SESSION_KEY = "anyloc-payment-success";

export type OnboardingSteps = {
  install: boolean;
  chooseSpot: boolean;
  activate: boolean;
};

export type OnboardingState = {
  welcomeDismissed: boolean;
  steps: OnboardingSteps;
};

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  welcomeDismissed: false,
  steps: {
    install: false,
    chooseSpot: false,
    activate: false,
  },
};

export const ONBOARDING_STEP_ITEMS = [
  {
    id: "install" as const,
    title: "Installe l'app sur ton téléphone",
    description:
      "Suis les étapes en bas de la carte. Ton code de liaison est déjà prêt — scanne le carré avec l'appareil photo.",
    cta: "Voir le guide",
  },
  {
    id: "chooseSpot" as const,
    title: "Choisis une ville",
    description:
      "Clique sur Marbella, Paris, Miami… à gauche, ou cherche une adresse en haut, ou tape sur la carte.",
  },
  {
    id: "activate" as const,
    title: "Allume ta fausse position",
    description:
      "Appuie sur le gros bouton en bas. Pour t'arrêter, appuie sur « Revenir à ma vraie position ».",
  },
] as const;

export function isOnboardingComplete(steps: OnboardingSteps) {
  return Object.values(steps).every(Boolean);
}

function migrateLegacySteps(
  steps: Record<string, boolean | undefined>
): OnboardingSteps {
  const activate = steps.activate === true || steps.sendPosition === true;

  return {
    install: steps.install ?? false,
    chooseSpot: steps.chooseSpot ?? false,
    activate,
  };
}

export function readOnboardingState(): OnboardingState {
  if (typeof window === "undefined") {
    return DEFAULT_ONBOARDING_STATE;
  }

  try {
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_ONBOARDING_STATE;
    }

    const parsed = JSON.parse(raw) as Partial<OnboardingState> & {
      steps?: Record<string, boolean>;
    };
    return {
      welcomeDismissed: parsed.welcomeDismissed ?? false,
      steps: migrateLegacySteps(parsed.steps ?? {}),
    };
  } catch {
    return DEFAULT_ONBOARDING_STATE;
  }
}

export function writeOnboardingState(state: OnboardingState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
}
