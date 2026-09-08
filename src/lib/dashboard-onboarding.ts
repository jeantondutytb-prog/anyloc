export const ONBOARDING_STORAGE_KEY = "anyloc-dashboard-onboarding";

export type OnboardingSteps = {
  install: boolean;
  chooseSpot: boolean;
  activate: boolean;
  sendPosition: boolean;
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
    sendPosition: false,
  },
};

export const ONBOARDING_STEP_ITEMS = [
  {
    id: "install" as const,
    title: "Installe l'app sur ton téléphone",
    description:
      "Suis le guide iOS ou Android — c'est l'étape indispensable avant d'envoyer une position.",
    cta: "Voir le guide",
  },
  {
    id: "chooseSpot" as const,
    title: "Choisis ta destination",
    description:
      "Clique sur la carte ou prends un spot rapide (Marbella, Ibiza, Miami…).",
  },
  {
    id: "activate" as const,
    title: "Active ton signal GPS",
    description:
      "Appuie sur « Activer » en haut à droite pour lancer le signal sur ton tel.",
  },
  {
    id: "sendPosition" as const,
    title: "Envoie la position",
    description:
      "Une fois le signal actif, clique sur « Envoyer cette position » pour synchroniser.",
  },
] as const;

export function isOnboardingComplete(steps: OnboardingSteps) {
  return Object.values(steps).every(Boolean);
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

    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return {
      welcomeDismissed: parsed.welcomeDismissed ?? false,
      steps: {
        ...DEFAULT_ONBOARDING_STATE.steps,
        ...parsed.steps,
      },
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
