export const ONBOARDING_STORAGE_KEY = "anyloc-dashboard-onboarding";
export const PAYMENT_SUCCESS_SESSION_KEY = "anyloc-payment-success";

export type OnboardingSteps = {
  install: boolean;
  chooseSpot: boolean;
  activate: boolean;
};

export type OnboardingState = {
  steps: OnboardingSteps;
};

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  steps: {
    install: false,
    chooseSpot: false,
    activate: false,
  },
};

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
      welcomeDismissed?: boolean;
    };
    return {
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
