import Foundation

@MainActor
final class AppState: ObservableObject {
    @Published var apiBaseUrl: String
    @Published var deviceToken: String
    @Published var statusMessage = "Configure ton token depuis le dashboard."
    @Published var isSyncing = false
    @Published var lastLocation: RemoteLocation?

    private let defaults = UserDefaults.standard
    private var syncTask: Task<Void, Never>?

    init() {
        apiBaseUrl = defaults.string(forKey: "apiBaseUrl") ?? "https://anyloc.io"
        deviceToken = defaults.string(forKey: "deviceToken") ?? ""
    }

    func saveSettings() {
        defaults.set(apiBaseUrl, forKey: "apiBaseUrl")
        defaults.set(deviceToken, forKey: "deviceToken")
    }

    func testConnection() async {
        statusMessage = "Connexion en cours..."

        do {
            let api = AnylocAPI(baseURL: apiBaseUrl, token: deviceToken)
            let location = try await api.fetchLocation()
            lastLocation = location
            statusMessage = location.isActive
                ? "Connecté · \(location.name)"
                : "Connecté · position en pause sur le dashboard"
        } catch {
            statusMessage = "Échec : \(error.localizedDescription)"
        }
    }

    func startSync() {
        saveSettings()
        syncTask?.cancel()
        isSyncing = true
        statusMessage = "Synchronisation active"

        syncTask = Task {
            let api = AnylocAPI(baseURL: apiBaseUrl, token: deviceToken)

            while !Task.isCancelled {
                do {
                    let location = try await api.fetchLocation()
                    lastLocation = location

                    if location.isActive {
                        await LocationSpoofService.shared.apply(location: location)
                        statusMessage = "Actif · \(location.name)"
                    } else {
                        statusMessage = "En pause — active le signal sur le dashboard"
                    }
                } catch {
                    statusMessage = "Erreur sync : \(error.localizedDescription)"
                }

                try? await Task.sleep(nanoseconds: 15_000_000_000)
            }
        }
    }

    func stopSync() {
        syncTask?.cancel()
        syncTask = nil
        isSyncing = false
        statusMessage = "Synchronisation arrêtée"
    }
}
