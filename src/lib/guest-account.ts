import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Fallback when no profile row has the email: walks every auth user. */
async function findAuthUserIdByEmail(email: string) {
  const admin = createAdminClient();
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Impossible de retrouver le compte: ${error.message}`);
    }

    const found = data.users.find(
      (user) => user.email?.toLowerCase() === email
    );

    if (found?.id) {
      return found.id;
    }

    if (data.users.length < perPage) {
      break;
    }
  }

  throw new Error("Compte introuvable pour cet email.");
}

/** Escapes LIKE wildcards so `ilike` is an exact, case-insensitive match. */
export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function ensureUserForEmail(email: string) {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin non configuré.");
  }

  const normalizedEmail = normalizeEmail(email);
  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    // Older rows kept the email as typed in Stripe (with capitals).
    .ilike("email", escapeLikePattern(normalizedEmail))
    .limit(1)
    .maybeSingle();

  if (existingProfile?.id) {
    return existingProfile.id;
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser(
    {
      email: normalizedEmail,
      email_confirm: true,
      user_metadata: {
        source: "guest_checkout",
      },
    }
  );

  if (created.user?.id) {
    return created.user.id;
  }

  if (
    createError?.message?.toLowerCase().includes("already") ||
    createError?.status === 422
  ) {
    return findAuthUserIdByEmail(normalizedEmail);
  }

  throw new Error(
    createError?.message ?? "Impossible de créer le compte utilisateur."
  );
}

/**
 * Sends the magic link to the account's own inbox instead of exposing it in
 * a redirect, so possessing a leaked checkout URL alone can't grant access.
 */
export async function sendMagicLinkEmail(email: string, redirectTo: string) {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin non configuré.");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}
