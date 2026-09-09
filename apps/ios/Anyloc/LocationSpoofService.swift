import Foundation

@MainActor
final class LocationSpoofService: ObservableObject {
    static let shared = LocationSpoofService()

    @Published private(set) var lastApplied: RemoteLocation?
    @Published private(set) var gpsStatus = "En attente"
    @Published private(set) var isConnected = false

    private let bridge = IDeviceLocationBridge()
    private var connectTask: Task<Void, Never>?

    private init() {}

    nonisolated var hasPairingFile: Bool {
        guard let documents = FileManager.default.urls(
            for: .documentDirectory,
            in: .userDomainMask
        ).first else {
            return false
        }

        let url = documents.appendingPathComponent("pairing.plist")
        return FileManager.default.fileExists(atPath: url.path)
    }

    func apply(location: RemoteLocation) async {
        if !location.isActive {
            await clearAppliedLocation()
            return
        }

        do {
            if !isConnected {
                gpsStatus = "Connexion au service GPS..."
                try await bridge.connect()
                isConnected = true
            }

            try await bridge.setLocation(lat: location.lat, lng: location.lng)
            lastApplied = location
            gpsStatus = "GPS actif · \(location.name)"
        } catch {
            isConnected = false
            await bridge.shutdown()
            lastApplied = nil
            gpsStatus = error.localizedDescription
        }
    }

    func clearAppliedLocation() async {
        guard isConnected else {
            lastApplied = nil
            gpsStatus = "GPS en pause"
            return
        }

        do {
            try await bridge.clearLocation()
            lastApplied = nil
            gpsStatus = "GPS en pause — position réelle"
        } catch {
            gpsStatus = error.localizedDescription
        }
    }

    func disconnect() async {
        connectTask?.cancel()
        connectTask = nil
        await bridge.shutdown()
        isConnected = false
        lastApplied = nil
        gpsStatus = "Déconnecté"
    }
}
