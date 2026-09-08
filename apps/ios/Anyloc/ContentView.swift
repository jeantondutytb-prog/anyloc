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
            }
            .navigationTitle("Anyloc")
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
}
