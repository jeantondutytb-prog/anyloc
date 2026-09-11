import SwiftUI

struct SettingsView: View {
    @ObservedObject var auth = AuthService.shared

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            VStack(spacing: 0) {
                HStack {
                    Text("Mon Profil")
                        .font(.title2.bold())
                        .foregroundColor(Theme.text)
                    Spacer()
                }
                .padding(.horizontal)
                .padding(.top, 16)

                Text("Gérez vos informations et préférences.")
                    .font(.caption)
                    .foregroundColor(Theme.textDim)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                    .padding(.top, 4)
                    .padding(.bottom, 12)

                ScrollView {
                    VStack(spacing: 16) {

                        // Informations personnelles
                        settingsSection("Informations Personnelles") {
                            VStack(spacing: 0) {
                                infoRow(label: "Email", value: auth.session?.user.email ?? "—")
                                Divider().background(Theme.border)
                                infoRow(label: "Rôle", value: "Utilisateur")
                                Divider().background(Theme.border)
                                infoRow(label: "Mode", value: "Télécommande iOS")
                            }
                        }

                        // Abonnement
                        settingsSection("Abonnement") {
                            VStack(spacing: 12) {
                                HStack(spacing: 12) {
                                    Image(systemName: "crown.fill")
                                        .font(.title2)
                                        .foregroundColor(Theme.accent)

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Plan actuel")
                                            .font(.caption)
                                            .foregroundColor(Theme.textDim)
                                        Text("Gratuit")
                                            .font(.subheadline.bold())
                                            .foregroundColor(Theme.text)
                                    }
                                    Spacer()
                                }
                                .padding(12)

                                Divider().background(Theme.border)

                                // Upgrade plans
                                VStack(spacing: 8) {
                                    planCard(
                                        name: "Mensuel",
                                        perDay: "0,33€",
                                        billedPrice: "9,90€/mois",
                                        ctaLabel: "Commencer maintenant",
                                        features: ["Changements illimités", "iOS + Android", "Support mail"],
                                        popular: false
                                    )
                                    planCard(
                                        name: "6 mois",
                                        perDay: "≈ 0,19€",
                                        billedPrice: "34,90€/6 mois",
                                        ctaLabel: "Économiser 40%",
                                        features: ["Tout le Mensuel", "Trajets simulés", "Support mail"],
                                        popular: false
                                    )
                                    planCard(
                                        name: "Annuel",
                                        perDay: "≈ 0,14€",
                                        billedPrice: "49,90€/an",
                                        ctaLabel: "Débloquer le meilleur prix",
                                        features: ["App iPhone sans ordi", "Support prioritaire", "3 profils web"],
                                        popular: true
                                    )
                                }
                                .padding(.horizontal, 12)
                                .padding(.bottom, 12)
                            }
                        }

                        // Gestion sécurisée
                        settingsSection("Gestion Sécurisée") {
                            VStack(alignment: .leading, spacing: 8) {
                                HStack(spacing: 8) {
                                    Image(systemName: "lock.shield.fill")
                                        .foregroundColor(Theme.success)
                                    Text("Paiements sécurisés par Stripe")
                                        .font(.caption.bold())
                                        .foregroundColor(Theme.text)
                                }
                                Text("Vous pouvez annuler votre abonnement ou modifier vos informations de paiement à tout moment via le portail client.")
                                    .font(.caption2)
                                    .foregroundColor(Theme.textDim)
                            }
                            .padding(12)
                        }

                        // App
                        settingsSection("Application") {
                            VStack(spacing: 0) {
                                infoRow(label: "Version", value: "0.1.0")
                                Divider().background(Theme.border)
                                infoRow(label: "Appareil", value: "iPhone")
                            }
                        }

                        // Déconnexion
                        settingsSection("Actions") {
                            Button {
                                auth.logout()
                            } label: {
                                HStack(spacing: 10) {
                                    Image(systemName: "rectangle.portrait.and.arrow.right")
                                        .foregroundColor(Theme.error)
                                    Text("Déconnexion")
                                        .font(.subheadline)
                                        .foregroundColor(Theme.error)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.caption2)
                                        .foregroundColor(Theme.textDim)
                                }
                                .padding(12)
                            }
                        }
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 80)
                }
            }
        }
    }

    // MARK: - Components

    private func settingsSection<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Theme.textDim)
                .tracking(0.8)
                .padding(.horizontal, 12)
                .padding(.bottom, 8)

            VStack(spacing: 0) {
                content()
            }
            .background(Theme.bgSurface)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Theme.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private func infoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundColor(Theme.textMuted)
            Spacer()
            Text(value)
                .font(.subheadline)
                .foregroundColor(Theme.text)
        }
        .padding(12)
    }

    private func planCard(name: String, perDay: String, billedPrice: String, ctaLabel: String, features: [String], popular: Bool) -> some View {
        VStack(spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(name)
                            .font(.subheadline.bold())
                            .foregroundColor(Theme.text)
                        if popular {
                            Text("POPULAIRE")
                                .font(.system(size: 9, weight: .heavy))
                                .foregroundColor(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Theme.accent)
                                .clipShape(Capsule())
                        }
                    }
                    HStack(alignment: .firstTextBaseline, spacing: 2) {
                        Text(perDay)
                            .font(.title2.bold())
                            .foregroundColor(Theme.accent)
                        Text("/jour")
                            .font(.caption)
                            .foregroundColor(Theme.textDim)
                    }
                    Text(billedPrice)
                        .font(.caption)
                        .foregroundColor(Theme.textDim)
                }
                Spacer()
                Button {} label: {
                    Text(ctaLabel)
                        .font(.caption2.bold())
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .frame(maxWidth: 110)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 7)
                        .background(popular ? Theme.accent : Theme.bgSurfaceHover)
                        .foregroundColor(popular ? .white : Theme.text)
                        .clipShape(Capsule())
                        .overlay(
                            Capsule().stroke(popular ? Color.clear : Theme.border, lineWidth: 1)
                        )
                }
            }

            HStack(spacing: 12) {
                ForEach(features, id: \.self) { f in
                    HStack(spacing: 3) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundColor(Theme.success)
                        Text(f)
                            .font(.system(size: 10))
                            .foregroundColor(Theme.textDim)
                            .lineLimit(1)
                    }
                }
                Spacer()
            }
        }
        .padding(12)
        .background(popular ? Theme.accent.opacity(0.06) : Theme.bg)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(popular ? Theme.accent.opacity(0.3) : Theme.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}
