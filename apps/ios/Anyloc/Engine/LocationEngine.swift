import Foundation
import idevice

enum LocationEngineError: LocalizedError {
    case invalidIP
    case pairingRead
    case tunnelCreate
    case remoteServer
    case simulationCreate
    case locationSet
    case locationClear
    case notActive

    var errorDescription: String? {
        switch self {
        case .invalidIP:
            return "L'adresse IP du tunnel est invalide. Vérifie l'IP du tunnel (généralement 10.7.0.1)."
        case .pairingRead:
            return "Impossible de lire le fichier RPPairing. Génère-en un avec idevice_pair en mode RPPairing."
        case .tunnelCreate:
            return "Impossible d'ouvrir le tunnel développeur. LocalDevVPN est-il connecté en Wi‑Fi ?"
        case .remoteServer:
            return "Connexion au tunnel OK, mais échec du handshake RemoteXPC."
        case .simulationCreate:
            return "Impossible d'ouvrir le service de simulation de position d'Apple."
        case .locationSet:
            return "Échec de la définition des coordonnées simulées."
        case .locationClear:
            return "Échec de la suppression de la position simulée."
        case .notActive:
            return "Aucune session de simulation active."
        }
    }
}

enum LocationEngine {
    private static let queue = DispatchQueue(label: "io.anyloc.location", qos: .userInitiated)

    private static var adapter: OpaquePointer?
    private static var handshake: OpaquePointer?
    private static var remoteServer: OpaquePointer?
    private static var locationSimulation: OpaquePointer?

    static var isSessionActive: Bool {
        locationSimulation != nil
    }

    static func set(
        latitude: Double,
        longitude: Double,
        pairingPath: String,
        deviceIP: String
    ) throws {
        try queue.sync {
            try setLocked(
                latitude: latitude,
                longitude: longitude,
                pairingPath: pairingPath,
                deviceIP: deviceIP
            ).get()
        }
    }

    static func clear() throws {
        try queue.sync {
            try clearLocked().get()
        }
    }

    private static func setLocked(
        latitude: Double,
        longitude: Double,
        pairingPath: String,
        deviceIP: String
    ) -> Result<Void, LocationEngineError> {
        if let locationSimulation {
            if let err = location_simulation_set(locationSimulation, latitude, longitude) {
                idevice_error_free(err)
                cleanup()
            } else {
                return .success(())
            }
        }

        var address = sockaddr_in()
        address.sin_family = sa_family_t(AF_INET)
        address.sin_port = in_port_t(TunnelConfig.defaultPort).bigEndian

        let inetResult = deviceIP.withCString { inet_pton(AF_INET, $0, &address.sin_addr) }
        guard inetResult == 1 else {
            return .failure(.invalidIP)
        }

        var pairingHandle: OpaquePointer?
        if let pairingError = pairingPath.withCString({ rp_pairing_file_read($0, &pairingHandle) }) {
            idevice_error_free(pairingError)
            return .failure(.pairingRead)
        }
        guard let pairingHandle else {
            return .failure(.pairingRead)
        }
        defer { rp_pairing_file_free(pairingHandle) }

        let providerError = withUnsafePointer(to: &address) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                tunnel_create_rppairing(
                    $0,
                    socklen_t(MemoryLayout<sockaddr_in>.stride),
                    "AnylocLocation",
                    pairingHandle,
                    nil,
                    nil,
                    &adapter,
                    &handshake
                )
            }
        }
        if let providerError {
            idevice_error_free(providerError)
            cleanup()
            return .failure(.tunnelCreate)
        }

        if let remoteServerError = remote_server_connect_rsd(adapter, handshake, &remoteServer) {
            idevice_error_free(remoteServerError)
            cleanup()
            return .failure(.remoteServer)
        }

        if let simError = location_simulation_new(remoteServer, &locationSimulation) {
            idevice_error_free(simError)
            cleanup()
            return .failure(.simulationCreate)
        }
        remoteServer = nil

        if let setError = location_simulation_set(locationSimulation, latitude, longitude) {
            idevice_error_free(setError)
            cleanup()
            return .failure(.locationSet)
        }

        return .success(())
    }

    private static func clearLocked() -> Result<Void, LocationEngineError> {
        if let locationSimulation {
            if let err = location_simulation_clear(locationSimulation) {
                idevice_error_free(err)
                cleanup()
                return .failure(.locationClear)
            }
        }

        cleanup()
        return .success(())
    }

    private static func cleanup() {
        if let locationSimulation {
            location_simulation_free(locationSimulation)
            self.locationSimulation = nil
        }
        if let remoteServer {
            remote_server_free(remoteServer)
            self.remoteServer = nil
        }
        if let handshake {
            rsd_handshake_free(handshake)
            self.handshake = nil
        }
        if let adapter {
            adapter_free(adapter)
            self.adapter = nil
        }
    }
}
