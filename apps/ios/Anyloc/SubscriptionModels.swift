import Foundation

struct SubscriptionInactiveDetails: Codable, Equatable {
    let reason: String
    let title: String
    let description: String
    let ctaLabel: String
    let checkoutUrl: String
    let pricingUrl: String
    let expiredUrl: String
    let supportEmail: String
    let previousPlanName: String?

    static let fallback = SubscriptionInactiveDetails(
        reason: "ended",
        title: "Abonnement terminé",
        description: "Ton abonnement n'est plus actif. Reprends une formule pour retrouver l'accès complet.",
        ctaLabel: "Reprendre mon abonnement",
        checkoutUrl: "https://www.anyloc.io/checkout?plan=annual",
        pricingUrl: "https://www.anyloc.io/pricing",
        expiredUrl: "https://www.anyloc.io/dashboard/expired",
        supportEmail: "support@anyloc.io",
        previousPlanName: nil
    )
}

struct SubscriptionAccessResponse: Codable {
    let hasAccess: Bool
    let status: String?
    let planId: String?
    let isTrial: Bool
    let inactive: SubscriptionInactiveDetails?
}
