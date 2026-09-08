import CoreLocation
import Foundation

/// Placeholder pour le spoofing GPS système.
/// L'implémentation finale utilisera les APIs développeur / simulation de position
/// une fois l'app sideloadée via Anyloc Setup.
@MainActor
final class LocationSpoofService: NSObject, ObservableObject {
    static let shared = LocationSpoofService()

    @Published private(set) var lastApplied: RemoteLocation?

    private let manager = CLLocationManager()

    override private init() {
        super.init()
        manager.delegate = self
    }

    func apply(location: RemoteLocation) async {
        lastApplied = location
        // TODO: brancher simulation GPS système (entitlements dev requis).
    }
}

extension LocationSpoofService: CLLocationManagerDelegate {}
