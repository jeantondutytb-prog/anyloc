import Foundation

@MainActor
final class AppState: ObservableObject {
    @Published var apiBaseUrl: String
    @Published var deviceToken: String
    @Published var statusMessage = "Configure ton token, puis choisis une ville."
    @Published var isSyncing = false
    @Published var lastLocation: RemoteLocation?
    @Published var searchQuery = ""
    @Published var searchResults: [GeocodeResult] = []
    @Published var isSearching = false
    @Published var isUpdatingLocation = false

    private let defaults = UserDefaults.standard
    private var syncTask: Task<Void, Never>?
    private var searchTask: Task<Void, Never>?

    init() {
        apiBaseUrl = defaults.string(forKey: "apiBaseUrl") ?? "https://www.anyloc.io"
        deviceToken = defaults.string(forKey: "deviceToken") ?? ""

        if !deviceToken.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            startSync()
        }
    }

    func saveSettings() {
        defaults.set(normalizedApiBaseUrl, forKey: "apiBaseUrl")
        defaults.set(deviceToken, forKey: "deviceToken")
    }

    private var normalizedApiBaseUrl: String {
        var url = apiBaseUrl.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))

        url = url.replacingOccurrences(
            of: #"^https?://anyloc\.io$"#,
            with: "https://www.anyloc.io",
            options: .regularExpression
        )

        return url.isEmpty ? "https://www.anyloc.io" : url
    }

    private var api: AnylocAPI? {
        let token = deviceToken.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !token.isEmpty else {
            return nil
        }

        return AnylocAPI(baseURL: normalizedApiBaseUrl, token: token)
    }

    func testConnection() async {
        guard let api else {
            statusMessage = "Colle ton token appareil d'abord."
            return
        }

        saveSettings()
        statusMessage = "Connexion en cours..."

        do {
            let location = try await api.fetchLocation()
            lastLocation = location
            statusMessage = location.isActive
                ? "Connecté · \(location.name)"
                : "Connecté · position en pause"
        } catch {
            statusMessage = "Échec : \(error.localizedDescription)"
        }
    }

    func searchPlaces() {
        searchTask?.cancel()

        let query = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines)

        guard query.count >= 2 else {
            searchResults = []
            return
        }

        searchTask = Task {
            try? await Task.sleep(nanoseconds: 350_000_000)

            guard !Task.isCancelled else {
                return
            }

            isSearching = true
            defer { isSearching = false }

            do {
                let api = AnylocAPI(baseURL: normalizedApiBaseUrl, token: deviceToken)
                let results = try await api.searchPlaces(query: query)

                guard !Task.isCancelled else {
                    return
                }

                searchResults = results
            } catch {
                searchResults = []
            }
        }
    }

    func activateLocation(_ result: GeocodeResult) async {
        guard let api else {
            statusMessage = "Colle ton token appareil d'abord."
            return
        }

        saveSettings()
        isUpdatingLocation = true
        statusMessage = "Activation de \(result.name)..."

        defer { isUpdatingLocation = false }

        do {
            let location = try await api.updateLocation(
                name: result.name,
                lat: result.lat,
                lng: result.lng,
                isActive: true
            )

            lastLocation = location
            searchQuery = result.name
            searchResults = []
            statusMessage = "Actif · \(location.name)"

            if !isSyncing {
                startSync()
            }

            await LocationSpoofService.shared.apply(location: location)
            statusMessage = LocationSpoofService.shared.gpsStatus
        } catch {
            statusMessage = "Erreur : \(error.localizedDescription)"
        }
    }

    func pauseLocation() async {
        guard let api, let current = lastLocation else {
            return
        }

        isUpdatingLocation = true
        defer { isUpdatingLocation = false }

        do {
            let location = try await api.updateLocation(
                name: current.name,
                lat: current.lat,
                lng: current.lng,
                isActive: false
            )

            lastLocation = location
            await LocationSpoofService.shared.clearAppliedLocation()
            statusMessage = LocationSpoofService.shared.gpsStatus
        } catch {
            statusMessage = "Erreur : \(error.localizedDescription)"
        }
    }

    func startSync() {
        saveSettings()
        syncTask?.cancel()
        isSyncing = true
        statusMessage = "Synchronisation active"

        syncTask = Task {
            let api = AnylocAPI(baseURL: normalizedApiBaseUrl, token: deviceToken)

            while !Task.isCancelled {
                do {
                    let location = try await api.fetchLocation()
                    lastLocation = location

                    if location.isActive {
                        await LocationSpoofService.shared.apply(location: location)
                        statusMessage = LocationSpoofService.shared.gpsStatus
                    } else {
                        await LocationSpoofService.shared.clearAppliedLocation()
                        statusMessage = "En pause"
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

        Task {
            await LocationSpoofService.shared.disconnect()
        }
    }
}
