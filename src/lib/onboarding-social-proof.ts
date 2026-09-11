import type { OnboardingDestination } from "@/lib/onboarding-destinations";

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function getDestinationSocialProof(destination: OnboardingDestination) {
  const today = new Date().toISOString().slice(0, 10);
  const seed = hashString(`${destination.city}-${today}`);
  const todayCount = 120 + (seed % 380);

  return {
    todayCount,
    todayLabel: `${todayCount} personnes ont faké leur loc à ${destination.city} aujourd'hui`,
    weeklyLabel: `${(12847 + (seed % 900)).toLocaleString("fr-FR")} locs fakées cette semaine`,
  };
}
