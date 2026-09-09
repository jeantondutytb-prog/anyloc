import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var appState: AppState
    @ObservedObject private var gps = LocationSpoofService.shared

    var body: some View {
        NavigationStack {
            Form {
                Section("Où veux-tu apparaître ?") {
                    TextField("Marbella, Paris, Miami...", text: $appState.searchQuery)
                        .textInputAutocapitalization(.words)
                        .autocorrectionDisabled()
                        .onChange(of: appState.searchQuery) { _, _ in
                            appState.searchPlaces()
                        }

                    if appState.isSearching {
                        HStack {
                            ProgressView()
                            Text("Recherche...")
                                .foregroundStyle(.secondary)
                        }
                    }

                    ForEach(appState.searchResults) { result in
                        Button {
                            Task { await appState.activateLocation(result) }
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(result.name)
                                    .foregroundStyle(.primary)
                                if !result.subtitle.isEmpty {
                                    Text(result.subtitle)
                                        .font(.footnote)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                        .disabled(appState.isUpdatingLocation)
                    }

                    if let location = appState.lastLocation {
                        LabeledContent("Position") {
                            Text(location.name)
                        }

                        if location.isActive {
                            Button("Mettre en pause", role: .destructive) {
                                Task { await appState.pauseLocation() }
                            }
                        }
                    }
                }

                Section("GPS sur ton iPhone") {
                    Text(gps.gpsStatus)
                        .font(.footnote)
                        .foregroundStyle(gps.isConnected ? Color.green : Color.secondary)

                    if !gps.hasPairingFile {
                        Text(
                            "Fichier pairing.plist manquant. Réinstalle via Anyloc Setup (Mac/PC une fois) "
                            + "pour le copier automatiquement sur ton iPhone."
                        )
                        .font(.footnote)
                        .foregroundStyle(.orange)
                    }

                    Text(
                        "Avant d'ouvrir Anyloc : lance LocalDevVPN et appuie sur Connect. "
                        + "Sans VPN local, la position ne peut pas être appliquée sur le système."
                    )
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                    Link(
                        "Télécharger LocalDevVPN",
                        destination: URL(string: "https://apps.apple.com/app/localdevvpn/id6755608044")!
                    )
                }

                Section("Configuration (une seule fois)") {
                    TextField("URL API", text: $appState.apiBaseUrl)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    SecureField("Token appareil", text: $appState.deviceToken)
                }

                Section("Statut") {
                    Text(appState.statusMessage)

                    if let location = appState.lastLocation {
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

                Section("Renouvellement sans Mac") {
                    Text(
                        "Toutes les ~7 jours : connecte-toi au Wi-Fi, ouvre LocalDevVPN et appuie sur Connect, "
                        + "puis relance Anyloc depuis ton écran d'accueil. Pas besoin de rebrancher ton Mac."
                    )
                    .font(.footnote)
                    .foregroundStyle(.secondary)
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
