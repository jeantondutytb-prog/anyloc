"use server";

import { redirect } from "next/navigation";
import {
  cancelStripeSubscriptionForUser,
} from "@/lib/account-billing";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { requireAuthenticatedUser } from "@/lib/subscription";

export type SettingsActionState = {
  error?: string;
  success?: string;
};

function translatePasswordError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("password should be at least")) {
    return "Le mot de passe doit contenir au moins 6 caractères.";
  }

  if (normalized.includes("same password")) {
    return "Le nouveau mot de passe doit être différent de l'actuel.";
  }

  return message;
}

export async function updatePassword(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!password || !confirmPassword) {
    return { error: "Renseigne ton nouveau mot de passe." };
  }

  if (password.length < 6) {
    return { error: "Le mot de passe doit contenir au moins 6 caractères." };
  }

  if (password !== confirmPassword) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  if (!isSupabaseConfigured()) {
    return { success: "Mot de passe mis à jour." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: translatePasswordError(error.message) };
  }

  return { success: "Mot de passe mis à jour." };
}

export async function deleteAccount(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (confirmation !== "SUPPRIMER") {
    return { error: "Tape SUPPRIMER pour confirmer la suppression." };
  }

  const { user, error } = await requireAuthenticatedUser();

  if (!user) {
    return { error: error ?? "Connecte-toi pour supprimer ton compte." };
  }

  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured()) {
    return { error: "La suppression de compte n'est pas disponible." };
  }

  await cancelStripeSubscriptionForUser(user.id);

  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return { error: "Impossible de supprimer le compte pour le moment." };
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/?account_deleted=1");
}
