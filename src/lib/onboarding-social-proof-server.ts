import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { getDestinationSocialProof } from "@/lib/onboarding-social-proof";
import type { OnboardingDestination } from "@/lib/onboarding-destinations";

const MIN_WEEKLY_DISPLAY = 100;

export type DestinationSocialProof = {
  todayCount: number;
  todayLabel: string;
  weeklyLabel: string;
  source: "database" | "fallback";
};

export async function getDestinationSocialProofFromDatabase(
  destination: OnboardingDestination
): Promise<DestinationSocialProof> {
  const fallback = getDestinationSocialProof(destination);

  if (!isSupabaseAdminConfigured()) {
    return {
      todayCount: fallback.todayCount,
      todayLabel: fallback.todayLabel,
      weeklyLabel: fallback.weeklyLabel,
      source: "fallback",
    };
  }

  const admin = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const todayStart = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;

  const [{ count: weeklyCount }, { count: todayCityCount }] = await Promise.all([
    admin
      .from("location_settings")
      .select("*", { count: "exact", head: true })
      .gte("updated_at", weekAgo)
      .eq("is_active", true),
    admin
      .from("location_settings")
      .select("*", { count: "exact", head: true })
      .ilike("name", `%${destination.city}%`)
      .gte("updated_at", todayStart),
  ]);

  const weekly = weeklyCount ?? 0;
  const today = todayCityCount ?? 0;

  if (weekly < MIN_WEEKLY_DISPLAY) {
    return {
      todayCount: fallback.todayCount,
      todayLabel: fallback.todayLabel,
      weeklyLabel: fallback.weeklyLabel,
      source: "fallback",
    };
  }

  const displayWeekly = Math.max(weekly, MIN_WEEKLY_DISPLAY);
  const displayToday = Math.max(today, 1);

  return {
    todayCount: displayToday,
    todayLabel: `${displayToday.toLocaleString("fr-FR")} personnes ont faké leur loc à ${destination.city} aujourd'hui`,
    weeklyLabel: `${displayWeekly.toLocaleString("fr-FR")} locs fakées cette semaine`,
    source: "database",
  };
}
