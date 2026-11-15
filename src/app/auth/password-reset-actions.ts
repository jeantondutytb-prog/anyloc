"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isResendConfigured, sendEmail } from "@/lib/email/resend";
import { logError } from "@/lib/log-error";
import {
  allowPasswordResetRequest,
  buildPasswordResetEmail,
  buildPasswordResetLink,
  isPlausibleTokenHash,
  normalizeResetEmail,
  PASSWORD_RESET_EXPIRED_ERROR,
  PASSWORD_RESET_SENT_NOTICE,
  RESET_TOKEN_COOKIE,
} from "@/lib/password-reset";
import { validateEmail, validatePassword } from "@/lib/password-policy";
import { capturePostHogEvent } from "@/lib/posthog/server";
import { getClientIpFromHeaders } from "@/lib/rate-limit";
import { getAppUrl } from "@/lib/stripe";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type PasswordResetState = { error?: string; notice?: string };

/** Supabase's answer for an address with no account: kept silent on purpose. */
function isUnknownUser(message: string) {
  return /user not found|not found|no user/i.test(message);
}

/**
 * Sends the "choose a new password" link. Always answers the same way,
 * account or not, so the form can't be used to find out who has an account.
 */
export async function requestPasswordReset(
  _prevState: PasswordResetState,
  formData: FormData
): Promise<PasswordResetState> {
  const email = normalizeResetEmail(String(formData.get("email") ?? ""));
  const emailError = validateEmail(email);
  if (emailError) {
    return { error: emailError };
  }

  if (!isSupabaseAdminConfigured() || !isResendConfigured()) {
    return { error: "Impossible d'envoyer le lien pour l'instant. Écris-nous sur le chat." };
  }

  const ip = getClientIpFromHeaders(await headers());
  if (!allowPasswordResetRequest({ email, ip })) {
    // Same answer as a success: an attacker learns nothing, the owner already has a link.
    return { notice: PASSWORD_RESET_SENT_NOTICE };
  }

  try {
    const { data, error } = await createAdminClient().auth.admin.generateLink({
      type: "recovery",
      email,
    });

    if (error || !data.properties?.hashed_token) {
      if (!error || !isUnknownUser(error.message)) {
        await logError("auth/password-reset", error ?? "generateLink returned no hashed_token");
      }
      return { notice: PASSWORD_RESET_SENT_NOTICE };
    }

    const link = buildPasswordResetLink(getAppUrl(), data.properties.hashed_token);
    await sendEmail({ to: email, ...buildPasswordResetEmail(link), tags: [{ name: "campaign", value: "password_reset" }] });

    if (data.user?.id) {
      await capturePostHogEvent({ distinctId: data.user.id, event: "password_reset_requested" });
    }
  } catch (error) {
    await logError("auth/password-reset", error);
  }

  return { notice: PASSWORD_RESET_SENT_NOTICE };
}

/** Spends the recovery token from the cookie and sets the new password. */
export async function resetPassword(
  _prevState: PasswordResetState,
  formData: FormData
): Promise<PasswordResetState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }
  if (password !== confirmPassword) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  const cookieStore = await cookies();
  const tokenHash = cookieStore.get(RESET_TOKEN_COOKIE)?.value;
  if (!isPlausibleTokenHash(tokenHash) || !isSupabaseConfigured()) {
    return { error: PASSWORD_RESET_EXPIRED_ERROR };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
  if (error || !data.user) {
    cookieStore.delete(RESET_TOKEN_COOKIE);
    return { error: PASSWORD_RESET_EXPIRED_ERROR };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password,
    data: { password_set: true },
  });
  cookieStore.delete(RESET_TOKEN_COOKIE);

  if (updateError) {
    // They typed their current password: it works, and the link logged them in.
    if (/different from the old|same password/i.test(updateError.message)) {
      redirect("/dashboard");
    }
    await logError("auth/password-reset/update", updateError, { userId: data.user.id });
    return {
      error: "Impossible de changer le mot de passe. Redemande un lien depuis « Mot de passe oublié ».",
    };
  }

  await capturePostHogEvent({ distinctId: data.user.id, event: "password_reset_completed" });
  redirect("/dashboard");
}
