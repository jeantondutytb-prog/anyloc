import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var appState: AppState

    private var wantsActivateGPS: Bool {
        switch appState.spoofStatus {
        case .idle, .dropped, .connecting:
            return true
        case .active, .reconnecting:
            return false
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Prérequis") {
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

                    HStack {
                        Circle()
                            .fill(appState.pairingStore.hasPairing ? .green : .red)
                            .frame(width: 10, height: 10)
                        Text(appState.pairingStore.hasPairing ? "Pairing importé" : "Pairing manquant")
                        Spacer()
                        Button("Importer") {
                            appState.showPairingPicker = true
                        }
                        Button("Coller") {
                            appState.importPairingFromClipboard()
                        }
                    }

                    if let pairingError = appState.pairingError {
                        Text(pairingError)
                            .foregroundStyle(.red)
                            .font(.footnote)
                    }
                }

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

                Section("GPS Spoofing") {
                    Text(spoofStatusLabel)
                        .foregroundStyle(spoofStatusColor)

                    Button(gpsToggleTitle) {
                        appState.toggleSpoof()
                    }
                    .disabled(wantsActivateGPS && !appState.canSpoof)

                    if !appState.canSpoof {
                        Text("Connecte LocalDevVPN et importe ton pairing d'abord.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("Configuration") {
                    TextField("URL API", text: $appState.apiBaseUrl)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    SecureField("Token appareil", text: $appState.deviceToken)
                }

                Section {
                    Text(appState.statusMessage)

                    if let location = appState.lastLocation {
                        LabeledContent("Coordonnées") {
                            Text("\(location.lat, specifier: "%.4f"), \(location.lng, specifier: "%.4f")")
                        }
                    }

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
                        "Toutes les ~7 jours : connecte-toi au Wi-Fi, ouvre LocalDevVPN et appuie sur Connect, puis relance Anyloc depuis ton écran d'accueil. Pas besoin de rebrancher ton Mac."
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
            .sheet(isPresented: $appState.showPairingPicker) {
                PairingDocumentPicker { url in
                    appState.importPairing(from: url)
                }
            }
        }
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
            return "Connecté"
        }
        if appState.isLocalDevVPNInstalled {
            return "Installé · non connecté"
        }
        return "Non installé"
    }

    private var localDevVPNButtonTitle: String {
        appState.isLocalDevVPNInstalled ? "Ouvrir" : "Installer"
    }

    private var spoofStatusLabel: String {
        switch appState.spoofStatus {
        case .idle:
            return "Inactif"
        case .connecting:
            return "Connexion au tunnel..."
        case .active:
            return "GPS actif"
        case .reconnecting:
            return "Reconnexion..."
        case .dropped(let message):
            return message
        }
    }

    private var spoofStatusColor: Color {
        appState.spoofStatus == .active ? .green : .primary
    }

    private var gpsToggleTitle: String {
        wantsActivateGPS ? "Activer le GPS" : "Désactiver le GPS"
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
}
