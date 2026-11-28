import { IOS_ADHOC_ELIGIBLE_PLANS } from "@/lib/ios-adhoc/config";

type ProfileForIphoneApp = {
  plan_id: string | null;
  subscription_status: string | null;
  is_admin?: boolean | null;
  is_clipper?: boolean | null;
};

/**
 * One line for Léa's account data: whether this customer has the iPhone app
 * (1-year plan, clipper, admin: same rule as isEligibleForIosAdhoc) or, on
 * iPhone, keeps the position through the computer.
 */
export function describeIphoneApp(profile: ProfileForIphoneApp) {
  const eligible =
    Boolean(profile.is_admin || profile.is_clipper) ||
    (profile.subscription_status === "active" &&
      Boolean(profile.plan_id && IOS_ADHOC_ELIGIBLE_PLANS.has(profile.plan_id)));

  return eligible
    ? "App iPhone : incluse (formule 1 an ou accès clippeur/admin), installable sans ordinateur."
    : "App iPhone : non incluse dans sa formule. Sur iPhone, c'est l'ordinateur qui tient la position (Anyloc ouvert sur l'ordi, iPhone en USB ou sur le même Wi-Fi) : ne lui parle pas d'app iPhone.";
}
