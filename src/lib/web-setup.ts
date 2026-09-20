export const WEB_SETUP_STORAGE_KEY = "anyloc-web-setup";
export const WEB_SETUP_TOKEN_KEY = "anyloc-web-spoof-token";
export const WEB_SETUP_METADATA_KEY = "anyloc_web_setup_completed";

export type WebSetupStepId = "phone" | "homescreen" | "shortcut" | "apps";

export type WebSetupSteps = Record<WebSetupStepId, boolean>;

export type WebSetupState = {
  completed: boolean;
  steps: WebSetupSteps;
};

export const DEFAULT_WEB_SETUP_STATE: WebSetupState = {
  completed: false,
  steps: {
    phone: false,
    homescreen: false,
    shortcut: false,
    apps: false,
  },
};

export const WEB_SETUP_STEP_ITEMS = [
  {
    id: "phone" as const,
    title: "Ouvre Anyloc sur ton téléphone",
    shortTitle: "Téléphone",
  },
  {
    id: "homescreen" as const,
    title: "Ajoute Anyloc à l'écran d'accueil",
    shortTitle: "Icône",
  },
  {
    id: "shortcut" as const,
    title: "Crée le bouton GPS",
    shortTitle: "GPS",
  },
  {
    id: "apps" as const,
    title: "Ouvre Snap dans le navigateur",
    shortTitle: "Apps",
  },
] as const;

export const WEB_APP_LINKS = [
  {
    id: "snapchat",
    label: "Snapchat Web",
    href: "https://www.snapchat.com/web",
  },
  {
    id: "tinder",
    label: "Tinder Web",
    href: "https://tinder.com",
  },
  {
    id: "instagram",
    label: "Instagram Web",
    href: "https://www.instagram.com",
  },
] as const;

export function isWebSetupComplete(state: WebSetupState) {
  return state.completed || WEB_SETUP_STEP_ITEMS.every((item) => state.steps[item.id]);
}

export function readWebSetupState(): WebSetupState {
  if (typeof window === "undefined") {
    return DEFAULT_WEB_SETUP_STATE;
  }

  try {
    const raw = window.localStorage.getItem(WEB_SETUP_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_WEB_SETUP_STATE;
    }

    const parsed = JSON.parse(raw) as Partial<WebSetupState> & {
      steps?: Partial<WebSetupSteps>;
    };

    return {
      completed: parsed.completed === true,
      steps: {
        phone: parsed.steps?.phone === true,
        homescreen: parsed.steps?.homescreen === true,
        shortcut: parsed.steps?.shortcut === true,
        apps: parsed.steps?.apps === true,
      },
    };
  } catch {
    return DEFAULT_WEB_SETUP_STATE;
  }
}

export function writeWebSetupState(state: WebSetupState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(WEB_SETUP_STORAGE_KEY, JSON.stringify(state));
}

export function readWebSpoofToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem(WEB_SETUP_TOKEN_KEY)?.trim();
  return token || null;
}

export function writeWebSpoofToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(WEB_SETUP_TOKEN_KEY, token);
}

export function getCurrentWebSetupStep(steps: WebSetupSteps) {
  return WEB_SETUP_STEP_ITEMS.find((item) => !steps[item.id]) ?? WEB_SETUP_STEP_ITEMS.at(-1)!;
}
