"use server";

import { redirect } from "next/navigation";
import { ensureStripeCustomerForUser } from "@/lib/billing";
import { getCheckoutUrl } from "@/lib/constants";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
};

function translateAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (normalized.includes("user already registered")) {
    return "Un compte existe déjà avec cet email.";
  }
  if (normalized.includes("password should be at least")) {
    return "Le mot de passe doit contenir au moins 6 caractères.";
  }
  if (normalized.includes("valid email")) {
    return "Adresse email invalide.";
  }

  return message;
}

function getRedirectTo(formData: FormData) {
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();
  return redirectTo || getCheckoutUrl("annual");
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
    redirect(getRedirectTo(formData));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  if (data.user?.email) {
    await linkStripeCustomer(data.user.id, data.user.email);
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

  if (password.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères." };
  }

  if (!isSupabaseConfigured()) {
    redirect(getRedirectTo(formData));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  if (data.user?.email) {
    await linkStripeCustomer(data.user.id, data.user.email);
  }

  redirect(getRedirectTo(formData));
}
