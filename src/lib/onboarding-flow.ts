import type { ClientDevice } from "@/lib/platform";

export type OnboardingMode = "android-phone" | "ios-phone" | "desktop";

export const COMPETITOR_ONBOARDING_STEPS = [
  {
    id: "subscribe",
    title: "Tu t'abonnes",
    description: "Paiement validé — ton accès est actif tout de suite.",
  },
  {
    id: "install",
    title: "Tu installes l'app",
    description:
      "Android : APK sur le tel. iPhone : ordi une fois, puis l'app reste sur ton iPhone.",
  },
  {
    id: "pin",
    title: "Tu poses ta pin",
    description:
      "Ouvre l'app, choisis une ville sur la carte, appuie sur Démarrer. C'est tout.",
  },
] as const;

export function getOnboardingMode(device: ClientDevice): OnboardingMode {
  if (!device.isPhone) {
    return "desktop";
  }

  if (typeof navigator !== "undefined" && /android/i.test(navigator.userAgent)) {
    return "android-phone";
  }

  return "ios-phone";
}

export function getPrimaryActionLabel(mode: OnboardingMode, desktopOs: "mac" | "win") {
  switch (mode) {
    case "android-phone":
      return "Télécharger l'app Android";
    case "ios-phone":
      return "Installer Anyloc sur mon iPhone";
    case "desktop":
      return desktopOs === "win"
        ? "Télécharger Anyloc pour Windows"
        : "Télécharger Anyloc pour Mac";
  }
}
