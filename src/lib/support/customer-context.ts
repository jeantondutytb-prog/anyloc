import { getPlanLabel } from "@/lib/account-billing";
import { logError } from "@/lib/log-error";
import { stripe } from "@/lib/stripe";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * What the agent may know about the person writing. The email comes from the
 * Crisp conversation, which the visitor can type freely: it is a lead, not a
 * proof of identity. Only fed to the model in draft mode, where an operator
 * reads the answer before the visitor does.
 */
export async function describeCustomer(email: string | null | undefined): Promise<string> {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return "Email inconnu : visiteur pas identifié (souvent une question avant achat).";
  }

  if (!isSupabaseAdminConfigured()) {
    return "Données du compte indisponibles.";
  }

  try {
    const admin = createAdminClient();
    // ilike for case-insensitivity only: escape its wildcards, or an email
    // typed as "%" would match someone else's account.
    const { data: profile } = await admin
      .from("profiles")
      .select("id, plan_id, subscription_status, stripe_subscription_id, created_at")
      .ilike("email", normalizedEmail.replace(/[\\%_]/g, "\\$&"))
      .limit(1)
      .maybeSingle();

    if (!profile) {
      return "Aucun compte Anyloc avec cet email (prospect, ou compte créé avec une autre adresse).";
    }

    const [devices, iosDevices, location] = await Promise.all([
      admin
        .from("device_tokens")
        .select("platform, last_seen_at, created_at")
        .eq("user_id", profile.id),
      admin
        .from("ios_devices")
        .select("status, product, os_version, error, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(3),
      admin
        .from("location_settings")
        .select("name, is_active, updated_at")
        .eq("user_id", profile.id)
        .maybeSingle(),
    ]);

    const lines = [
      `Compte créé le ${formatDate(profile.created_at)}.`,
      `Formule : ${getPlanLabel(profile.plan_id) ?? "aucune"} — statut : ${profile.subscription_status ?? "aucun abonnement"}.`,
    ];

    if (stripe && profile.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
        lines.push(`Abonnement démarré le ${formatDate(subscription.start_date * 1000)}.`);
        if (subscription.cancel_at_period_end || subscription.cancel_at) {
          lines.push(
            `Résiliation programmée${
              subscription.cancel_at ? ` (fin d'accès le ${formatDate(subscription.cancel_at * 1000)})` : ""
            }.`
          );
        }
      } catch (error) {
        await logError("support-agent/customer-subscription", error, { userId: profile.id });
      }
    }

    const deviceRows = devices.data ?? [];
    lines.push(
      deviceRows.length === 0
        ? "Aucun téléphone connecté au compte."
        : `Téléphones connectés : ${deviceRows
            .map(
              (device) =>
                `${device.platform} (vu pour la dernière fois ${
                  device.last_seen_at ? `le ${formatDate(device.last_seen_at)}` : "jamais"
                })`
            )
            .join(", ")}.`
    );

    for (const device of iosDevices.data ?? []) {
      lines.push(
        `Installation app iPhone sans ordi : ${device.status}${device.product ? `, ${device.product}` : ""}${
          device.os_version ? ` iOS ${device.os_version}` : ""
        }${device.error ? `, erreur : ${device.error}` : ""}.`
      );
    }

    // Whether a position is on is enough to troubleshoot; where it is isn't needed.
    if (location.data) {
      lines.push(
        `Position ${location.data.is_active ? "activée" : "désactivée"} (mise à jour le ${formatDate(
          location.data.updated_at
        )}).`
      );
    }

    return lines.join("\n");
  } catch (error) {
    await logError("support-agent/customer-context", error);
    return "Données du compte indisponibles.";
  }
}

function formatDate(value: string | number) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}
