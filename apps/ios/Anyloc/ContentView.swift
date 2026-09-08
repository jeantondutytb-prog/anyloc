import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        NavigationStack {
            Form {
                Section("Configuration") {
                    TextField("URL API", text: $appState.apiBaseUrl)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    SecureField("Token appareil", text: $appState.deviceToken)
                }

                Section("Statut") {
                    Text(appState.statusMessage)

                    if let location = appState.lastLocation {
                        LabeledContent("Spot") {
                            Text(location.name)
                        }
                        LabeledContent("Coordonnées") {
                            Text("\(location.lat, specifier: "%.4f"), \(location.lng, specifier: "%.4f")")
                        }
                    }
                }

                Section {
                    Button("Tester la connexion") {
                        Task { await appState.testConnection() }
                    }

                    if appState.isSyncing {
                        Button("Arrêter la sync", role: .destructive) {
                            appState.stopSync()
                        }
                    } else {
                        Button("Démarrer la synchronisation") {
                            appState.startSync()
                        }
                    }
                }

                Section("Renouvellement (LocalDevVPN)") {
                    Text(
                        "Toutes les ~7 jours, ouvre LocalDevVPN, connecte le VPN, puis relance Anyloc Setup sur ton Mac pour réinstaller l'app si nécessaire."
                    )
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                    Link(
                        "Télécharger LocalDevVPN",
                        destination: URL(string: "https://apps.apple.com/app/localdevvpn/id6755608044")!
                    )
                }
            }
            .navigationTitle("Anyloc")
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
}
