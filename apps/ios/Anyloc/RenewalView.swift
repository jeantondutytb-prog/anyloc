import SwiftUI

struct RenewalView: View {
    @ObservedObject private var renewal = SignatureRenewalService.shared
    @Environment(\.dismiss) private var dismiss

    @State private var isWorking = false
    @State private var localDevConnected = false

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    header
                    statusCard
                    stepsCard
                    actions
                    helpCard
                }
                .padding(20)
                .padding(.bottom, 40)
            }
        }
        .preferredColorScheme(.light)
        .task {
            await renewal.refreshPairingStatus()
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "chevron.left")
                        .foregroundColor(Theme.textDim)
                }
                Spacer()
            }

            Text("Renouveler Anyloc")
                .font(.title.bold())
                .foregroundColor(Theme.text)

            Text("Sans compte Apple payant, l'app iPhone dure ~7 jours. Le renouvellement se fait depuis ton tel avec LocalDevVPN — pas besoin de rebrancher l'ordi.")
                .font(.subheadline)
                .foregroundColor(Theme.textMuted)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var statusCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: statusIcon)
                    .foregroundColor(statusColor)
                Text(statusTitle)
                    .font(.headline)
                    .foregroundColor(Theme.text)
            }

            Text(statusSubtitle)
                .font(.subheadline)
                .foregroundColor(Theme.textMuted)
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: 16) {
                statusPill(
                    label: "Pairing",
                    value: renewal.hasPairingOnServer ? "Prêt" : "Manquant",
                    ok: renewal.hasPairingOnServer
                )
                statusPill(
                    label: "Fichier local",
                    value: renewal.pairingSavedLocally ? "OK" : "—",
                    ok: renewal.pairingSavedLocally
                )
            }
        }
        .padding(16)
        .cardBackground()
    }

    private var stepsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("ÉTAPES")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Theme.textDim)
                .tracking(0.8)

            renewalStep(number: 1, title: "Wi-Fi", detail: "Connecte ton iPhone au Wi-Fi.")
            renewalStep(number: 2, title: "LocalDevVPN", detail: "Installe l'app (gratuite), ouvre-la et appuie sur Connect jusqu'au bouton vert.")
            renewalStep(number: 3, title: "Renouveler", detail: "Reviens ici et appuie sur Renouveler, puis relance Anyloc.")
        }
        .padding(16)
        .cardBackground()
    }

    private var actions: some View {
        VStack(spacing: 12) {
            Button {
                renewal.openLocalDevVpnStore()
            } label: {
                Label("Installer / ouvrir LocalDevVPN", systemImage: "arrow.down.app")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .foregroundColor(Theme.text)
            }
            .cardBackground()

            Toggle(isOn: $localDevConnected) {
                Text("LocalDevVPN est connecté (bouton vert)")
                    .font(.subheadline)
                    .foregroundColor(Theme.text)
            }
            .tint(Theme.accentSolid)
            .padding(.horizontal, 4)

            Button {
                Task { await runRenewal() }
            } label: {
                HStack {
                    if isWorking {
                        ProgressView()
                            .tint(.white)
                    }
                    Text(isWorking ? "Vérification…" : "Renouveler")
                }
            }
            .buttonStyle(PrimaryGradientButtonStyle(isDisabled: !localDevConnected || isWorking))
            .disabled(!localDevConnected || isWorking)

            if let message = renewal.statusMessage {
                Text(message)
                    .font(.footnote)
                    .foregroundColor(Theme.textMuted)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .cardBackground(cornerRadius: 12)
            }
        }
    }

    private var helpCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("L'app ne s'ouvre plus du tout ?")
                .font(.subheadline.bold())
                .foregroundColor(Theme.text)
            Text("Rebranche l'iPhone sur ton ordinateur et réinstalle via Anyloc. C'est rare si tu renouvelles tous les ~7 jours.")
                .font(.footnote)
                .foregroundColor(Theme.textDim)
            Button("Voir le guide sur le site") {
                renewal.openRenewalHelp()
            }
            .font(.footnote.weight(.semibold))
            .foregroundColor(Theme.accentSolid)
        }
        .padding(16)
        .background(Theme.accentSolid.opacity(0.08))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Theme.accentSolid.opacity(0.25), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func renewalStep(number: Int, title: String, detail: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)")
                .font(.caption.bold())
                .foregroundColor(.white)
                .frame(width: 24, height: 24)
                .background(Theme.accentSolid)
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.bold())
                    .foregroundColor(Theme.text)
                Text(detail)
                    .font(.footnote)
                    .foregroundColor(Theme.textMuted)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func statusPill(label: String, value: String, ok: Bool) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundColor(Theme.textDim)
            Text(value)
                .font(.caption.bold())
                .foregroundColor(ok ? Theme.success : Theme.error)
        }
    }

    private var statusIcon: String {
        switch renewal.state {
        case .expired:
            return "exclamationmark.triangle.fill"
        case .soon:
            return "clock.fill"
        default:
            return "checkmark.shield.fill"
        }
    }

    private var statusColor: Color {
        switch renewal.state {
        case .expired:
            return Theme.error
        case .soon:
            return .orange
        default:
            return Theme.success
        }
    }

    private var statusTitle: String {
        switch renewal.state {
        case .expired:
            return "Renouvellement recommandé"
        case .soon(let days):
            return "Expire bientôt (\(days) jour\(days > 1 ? "s" : ""))"
        case .healthy(let days):
            return "Signature OK (~\(days) jours restants)"
        case .unknown:
            return "Statut signature"
        }
    }

    private var statusSubtitle: String {
        switch renewal.state {
        case .expired:
            return "Connecte LocalDevVPN puis appuie sur Renouveler. Si Anyloc ne démarre plus, réinstalle une fois depuis l'ordi."
        case .soon:
            return "Pense à renouveler maintenant pour éviter une réinstallation USB."
        default:
            return "Tu peux renouveler d'avance dès que tu veux — ça ne casse rien."
        }
    }

    private func runRenewal() async {
        isWorking = true
        defer { isWorking = false }
        _ = await renewal.performRenewalFlow()
    }
}

struct RenewalBanner: View {
    @ObservedObject private var renewal = SignatureRenewalService.shared
    @Binding var showRenewal: Bool

    var body: some View {
        if renewal.shouldShowBanner {
            Button {
                showRenewal = true
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: "clock.badge.exclamationmark")
                        .foregroundColor(.orange)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(bannerTitle)
                            .font(.subheadline.bold())
                            .foregroundColor(Theme.text)
                        Text("Renouveler avec LocalDevVPN (2 min, sans ordi)")
                            .font(.caption)
                            .foregroundColor(Theme.textDim)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(Theme.textDim)
                }
                .padding(12)
                .background(Color.orange.opacity(0.12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.orange.opacity(0.35), lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)
            .padding(.horizontal)
            .padding(.top, 8)
        }
    }

    private var bannerTitle: String {
        switch renewal.state {
        case .expired:
            return "Anyloc doit être renouvelé"
        case .soon(let days):
            return "Renouvellement dans \(days) jour\(days > 1 ? "s" : "")"
        default:
            return "Renouvellement"
        }
    }
}
