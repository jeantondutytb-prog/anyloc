import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function findAuthUserIdByEmail(email: string) {
  const admin = createAdminClient();

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
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

    if (data.users.length < 200) {
      break;
    }
  }

  throw new Error("Compte introuvable pour cet email.");
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
    .eq("email", normalizedEmail)
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

export async function createMagicLinkRedirectUrl(
  email: string,
  redirectTo: string
) {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase admin non configuré.");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: normalizeEmail(email),
    options: {
      redirectTo,
    },
  });

  if (error || !data.properties?.action_link) {
    throw new Error(
      error?.message ?? "Impossible de générer le lien de connexion."
    );
  }

  return data.properties.action_link;
}
