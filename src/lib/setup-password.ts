import type { User } from "@supabase/supabase-js";

export function userNeedsSetupPassword(user: Pick<User, "identities" | "user_metadata">) {
  const providers = user.identities?.map((identity) => identity.provider) ?? [];

  if (providers.includes("google") || providers.includes("apple")) {
    return false;
  }

  if (user.user_metadata?.password_set === true) {
    return false;
  }

  return user.user_metadata?.source === "guest_checkout";
}
