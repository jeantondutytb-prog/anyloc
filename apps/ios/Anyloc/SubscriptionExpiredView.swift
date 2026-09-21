import SwiftUI

struct SubscriptionExpiredView: View {
    let details: SubscriptionInactiveDetails

    @ObservedObject private var auth = AuthService.shared

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    HStack {
                        HStack(spacing: 8) {
                            Image(systemName: "mappin.circle.fill")
                                .foregroundColor(Theme.accentSolid)
                            Text("Anyloc")
                                .font(.headline.bold())
                                .foregroundColor(Theme.text)
                        }

                        Spacer()

                        Button {
                            auth.logout()
                        } label: {
                            Label("Se déconnecter", systemImage: "rectangle.portrait.and.arrow.right")
                                .font(.caption.weight(.semibold))
                                .foregroundColor(Theme.textDim)
                        }
                    }

                    VStack(alignment: .leading, spacing: 16) {
                        iconView
                            .frame(width: 48, height: 48)
                            .cardBackground(cornerRadius: 14)

                        Text(details.title)
                            .font(.title.bold())
                            .foregroundColor(Theme.text)

                        Text(details.description)
                            .font(.body)
                            .foregroundColor(Theme.textMuted)
                            .fixedSize(horizontal: false, vertical: true)

                        if let planName = details.previousPlanName, !planName.isEmpty {
                            Text("Dernière formule : \(planName)")
                                .font(.subheadline)
                                .foregroundColor(Theme.textMuted)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(14)
                                .cardBackground(cornerRadius: 14)
                        }

                        Button {
                            openURL(details.checkoutUrl)
                        } label: {
                            Text(details.ctaLabel)
                        }
                        .buttonStyle(PrimaryGradientButtonStyle())

                        Button {
                            openURL(details.pricingUrl)
                        } label: {
                            Text("Comparer les offres")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .foregroundColor(Theme.text)
                        }
                        .cardBackground(cornerRadius: 14)

                        if details.reason == "payment_failed" {
                            Text("Tu peux aussi mettre à jour ta carte depuis le checkout Stripe, ou nous écrire sur \(details.supportEmail).")
                                .font(.footnote)
                                .foregroundColor(Theme.textDim)
                        }
                    }
                    .padding(24)
                    .background(
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Theme.bgSurface)
                            .overlay(
                                RoundedRectangle(cornerRadius: 20)
                                    .stroke(Theme.accentSolid.opacity(0.25), lineWidth: 1)
                            )
                    )

                    Text("Besoin d'aide pour te reconnecter ? Contacte le support")
                        .font(.footnote)
                        .foregroundColor(Theme.textDim)
                        .frame(maxWidth: .infinity)
                        .multilineTextAlignment(.center)
                }
                .padding(20)
            }
        }
        .preferredColorScheme(.light)
    }

    @ViewBuilder
    private var iconView: some View {
        switch details.reason {
        case "payment_failed":
            Image(systemName: "creditcard.fill")
                .foregroundColor(.orange)
        case "trial_cancelled", "trial_ended":
            Image(systemName: "sparkles")
                .foregroundColor(Theme.accentSolid)
        default:
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(Theme.text)
        }
    }

    private func openURL(_ raw: String) {
        guard let url = URL(string: raw) else { return }
        UIApplication.shared.open(url)
    }
}
