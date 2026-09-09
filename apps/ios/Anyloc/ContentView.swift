import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        NavigationStack {
            Form {
                Section("Comment ça marche") {
                    Text(
                        "Choisis ta ville sur le site anyloc.io depuis un ordinateur. Laisse cette app ouverte sur ton iPhone — ta fausse position se met toute seule."
                    )
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                    if let location = appState.lastLocation {
                        LabeledContent("Tu apparais à") {
                            Text(location.name)
                        }

                        if location.isActive {
                            Label("Fausse position allumée", systemImage: "checkmark.circle.fill")
                                .foregroundStyle(.green)
                        } else {
                            Text("En pause — choisis une ville sur le site")
                                .foregroundStyle(.secondary)
                                .font(.footnote)
                        }
                    }

                    Text(appState.statusMessage)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("LocalDevVPN (obligatoire sur iPhone)") {
                    HStack {
                        Circle()
                            .fill(localDevVPNColor)
                            .frame(width: 10, height: 10)
                        Text(localDevVPNStatusText)
                        Spacer()
                        Button(localDevVPNButtonTitle) {
                            LocalDevVPNHelper.openOrInstall()
                        }
                    }

                    Text(
                        "Installe cette petite app gratuite. Environ une fois par semaine : connecte-toi au Wi-Fi, ouvre LocalDevVPN, appuie sur Connect, puis relance Anyloc."
                    )
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                }

                Section("Connexion au site") {
                    HStack(alignment: .center) {
                        Circle()
                            .fill(pairingStatusColor)
                            .frame(width: 10, height: 10)

                        if appState.isDownloadingPairing {
                            HStack(spacing: 8) {
                                ProgressView()
                                    .controlSize(.small)
                                Text("Connexion en cours...")
                            }
                        } else if appState.pairingStore.hasPairing {
                            Text("iPhone connecté à ton compte")
                        } else {
                            Text("Pas encore connecté")
                        }

                        Spacer()

                        if !appState.isDownloadingPairing && !appState.pairingStore.hasPairing {
                            Button("Réessayer") {
                                Task { await appState.retryPairingDownload() }
                            }
                        }
                    }

                    if let pairingError = appState.pairingError {
                        Text(pairingError)
                            .foregroundStyle(.red)
                            .font(.footnote)
                    }

                    SecureField("Mot de passe (normalement déjà rempli)", text: $appState.deviceToken)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .onSubmit {
                            appState.saveSettings()
                        }
                }
            }
            .navigationTitle("Anyloc")
        }
    }

    private var pairingStatusColor: Color {
        if appState.isDownloadingPairing {
            return .orange
        }

        return appState.pairingStore.hasPairing ? .green : .red
    }

    private var localDevVPNColor: Color {
        if appState.isLocalDevVPNConnected {
            return .green
        }
        if appState.isLocalDevVPNInstalled {
            return .orange
        }
        return .red
    }

    private var localDevVPNStatusText: String {
        if appState.isLocalDevVPNConnected {
            return "Connecté — c'est bon"
        }
        if appState.isLocalDevVPNInstalled {
            return "Installé — appuie sur Ouvrir puis Connect"
        }
        return "Pas encore installé"
    }

    private var localDevVPNButtonTitle: String {
        appState.isLocalDevVPNInstalled ? "Ouvrir" : "Installer"
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
}
