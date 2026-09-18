"use server";

import { redirect } from "next/navigation";
import { resolvePostAuthRedirect } from "@/lib/auth-redirect";
import { ensureStripeCustomerForUser } from "@/lib/billing";
import { getCheckoutUrl } from "@/lib/constants";
import {
  capturePostHogEvent,
  identifyPostHogUser,
} from "@/lib/posthog/server";
import { validateEmail, validatePassword } from "@/lib/password-policy";
import { sanitizeRedirectPath } from "@/lib/safe-redirect";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
};

export async function signOut() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function translateAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (normalized.includes("user already registered")) {
    return "Un compte existe déjà avec cet email.";
  }
  if (normalized.includes("password should be at least")) {
    return "Le mot de passe ne respecte pas les critères minimaux.";
  }
  if (normalized.includes("valid email")) {
    return "Adresse email invalide.";
  }

  return message;
}

function getRedirectTo(formData: FormData) {
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();
  return sanitizeRedirectPath(redirectTo, getCheckoutUrl());
}

async function linkStripeCustomer(userId: string, email: string) {
  try {
    await ensureStripeCustomerForUser({ userId, email });
  } catch (error) {
    console.error("[auth] Failed to create Stripe customer:", error);
  }
}

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Renseigne ton email et ton mot de passe." };
  }

  if (!isSupabaseConfigured()) {
    return { error: "L'authentification n'est pas configurée." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  if (data.user) {
    if (data.user.email) {
      await linkStripeCustomer(data.user.id, data.user.email);
    }

    await identifyPostHogUser({
      distinctId: data.user.id,
      properties: { email: data.user.email },
    });
    await capturePostHogEvent({
      distinctId: data.user.id,
      event: "login_completed",
    });

    redirect(
      await resolvePostAuthRedirect(
        data.user.id,
        data.user.email,
        getRedirectTo(formData)
      )
    );
  }

  redirect(getRedirectTo(formData));
}

export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Renseigne ton email et ton mot de passe." };
  }

  const emailError = validateEmail(email);

  if (emailError) {
    return { error: emailError };
  }

  const passwordError = validatePassword(password);

  if (passwordError) {
    return { error: passwordError };
  }

  if (!isSupabaseConfigured()) {
    return { error: "L'authentification n'est pas configurée." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  if (data.user) {
    if (data.user.email) {
      await linkStripeCustomer(data.user.id, data.user.email);
    }

    await identifyPostHogUser({
      distinctId: data.user.id,
      properties: { email: data.user.email },
    });
    await capturePostHogEvent({
      distinctId: data.user.id,
      event: "signup_completed",
    });

    redirect(
      await resolvePostAuthRedirect(
        data.user.id,
        data.user.email,
        getRedirectTo(formData)
      )
    );
  }

  redirect(getRedirectTo(formData));
}
