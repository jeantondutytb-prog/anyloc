import CoreLocation
import Foundation

@MainActor
final class LocationSpoofService: ObservableObject {
    static let shared = LocationSpoofService()

    @Published private(set) var lastApplied: RemoteLocation?
    let spoofSession = SpoofSession()

    private init() {}

    func apply(location: RemoteLocation, pairingPath: String?) {
        lastApplied = location

        if location.isActive {
            guard pairingPath != nil else {
                print("Anyloc: pairing manquant — importe un fichier RPPairing avant de lancer le spoofing.")
                return
            }
            guard LocalDevVPNHelper.isConnected else {
                print("Anyloc: LocalDevVPN non connecté — le tunnel 10.7.0.x est requis.")
                return
            }
            spoofSession.start(
                latitude: location.lat,
                longitude: location.lng,
                pairingPath: pairingPath!
            )
        } else if spoofSession.isSpoofing {
            spoofSession.stop()
        }
    }
}
