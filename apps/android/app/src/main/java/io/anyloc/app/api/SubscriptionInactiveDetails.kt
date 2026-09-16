package io.anyloc.app.api

import org.json.JSONObject

data class SubscriptionInactiveDetails(
    val reason: String,
    val title: String,
    val description: String,
    val ctaLabel: String,
    val checkoutUrl: String,
    val pricingUrl: String,
    val expiredUrl: String,
    val supportEmail: String,
    val previousPlanName: String?,
) {
    fun toJson(): JSONObject {
        return JSONObject()
            .put("reason", reason)
            .put("title", title)
            .put("description", description)
            .put("ctaLabel", ctaLabel)
            .put("checkoutUrl", checkoutUrl)
            .put("pricingUrl", pricingUrl)
            .put("expiredUrl", expiredUrl)
            .put("supportEmail", supportEmail)
            .put("previousPlanName", previousPlanName)
    }

    companion object {
        fun fallback(baseUrl: String): SubscriptionInactiveDetails {
            val origin = baseUrl.trimEnd('/')
            return SubscriptionInactiveDetails(
                reason = "ended",
                title = "Abonnement terminé",
                description = "Ton abonnement n'est plus actif. Reprends une formule pour retrouver l'accès complet.",
                ctaLabel = "Reprendre mon abonnement",
                checkoutUrl = "$origin/checkout?plan=annual",
                pricingUrl = "$origin/pricing",
                expiredUrl = "$origin/dashboard/expired",
                supportEmail = "support@anyloc.io",
                previousPlanName = null,
            )
        }

        fun fromJson(json: JSONObject?): SubscriptionInactiveDetails? {
            if (json == null) {
                return null
            }

            val title = json.optString("title")
            if (title.isBlank()) {
                return null
            }

            return SubscriptionInactiveDetails(
                reason = json.optString("reason", "ended"),
                title = title,
                description = json.optString(
                    "description",
                    "Ton abonnement n'est plus actif. Reprends une formule pour retrouver l'accès complet."
                ),
                ctaLabel = json.optString("ctaLabel", "Reprendre mon abonnement"),
                checkoutUrl = json.optString("checkoutUrl"),
                pricingUrl = json.optString("pricingUrl"),
                expiredUrl = json.optString("expiredUrl"),
                supportEmail = json.optString("supportEmail", "support@anyloc.io"),
                previousPlanName = json.optString("previousPlanName").ifBlank { null },
            )
        }
    }
}
