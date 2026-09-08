"use server";

import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getCheckoutUrl } from "@/lib/constants";

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
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: translateAuthError(error.message) };
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
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  redirect(getRedirectTo(formData));
}
