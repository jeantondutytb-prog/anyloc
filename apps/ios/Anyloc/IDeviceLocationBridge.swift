import Foundation
import IDeviceFFI

enum IDeviceLocationError: LocalizedError {
    case pairingFileMissing
    case tunnelFailed(String)
    case notConnected
    case invalidCoordinate

    var errorDescription: String? {
        switch self {
        case .pairingFileMissing:
            return """
            Fichier pairing.plist manquant. Branche ton iPhone une dernière fois à Anyloc Setup \
            pour l'installer, ou ajoute-le via Réglages → Mode développeur → Autres appareils.
            """
        case .tunnelFailed(let message):
            return message
        case .notConnected:
            return "Service GPS non connecté. Ouvre LocalDevVPN et appuie sur Connect, puis relance Anyloc."
        case .invalidCoordinate:
            return "Coordonnées invalides."
        }
    }
}

/// Pont vers les services développeur iOS (simulation GPS système).
///
/// Sur iPhone, une app ne peut pas joindre 127.0.0.1 : le tunnel LocalDevVPN expose
/// l'appareil sur 10.7.0.1:49152.
actor IDeviceLocationBridge {
    private let host: String
    private let port: UInt16

    private var adapter: OpaquePointer?
    private var handshake: OpaquePointer?
    private var server: OpaquePointer?
    private var simulation: OpaquePointer?

    init(host: String = "10.7.0.1", port: UInt16 = 49152) {
        self.host = host
        self.port = port
    }

    var hasPairingFile: Bool {
        pairingFileURL != nil
    }

    private nonisolated var pairingFileURL: URL? {
        guard let documents = FileManager.default.urls(
            for: .documentDirectory,
            in: .userDomainMask
        ).first else {
            return nil
        }

        let url = documents.appendingPathComponent("pairing.plist")
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }

    func connect() async throws {
        guard let pairingPath = pairingFileURL?.path else {
            throw IDeviceLocationError.pairingFileMissing
        }

        await shutdown()

        var pairingFile: OpaquePointer?
        try check(
            pairingPath.withCString { rp_pairing_file_read($0, &pairingFile) },
            "lecture du pairing.plist"
        )
        defer {
            if let pairingFile {
                rp_pairing_file_free(pairingFile)
            }
        }

        var address = sockaddr_in()
        address.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
        address.sin_family = sa_family_t(AF_INET)
        address.sin_port = port.bigEndian

        guard inet_pton(AF_INET, host, &address.sin_addr) == 1 else {
            throw IDeviceLocationError.tunnelFailed("Adresse tunnel invalide (\(host))")
        }

        var newAdapter: OpaquePointer?
        var newHandshake: OpaquePointer?

        try withUnsafePointer(to: &address) { pointer in
            try pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPointer in
                try host.withCString { hostname in
                    try check(
                        tunnel_create_rppairing(
                            sockaddrPointer,
                            socklen_t(MemoryLayout<sockaddr_in>.size),
                            hostname,
                            pairingFile,
                            nil,
                            nil,
                            &newAdapter,
                            &newHandshake
                        ),
                        "ouverture du tunnel (LocalDevVPN connecté ?)"
                    )
                }
            }
        }

        adapter = newAdapter
        handshake = newHandshake

        do {
            try mountDeveloperImageIfNeeded(adapter: newAdapter, handshake: newHandshake)
        } catch {
            // Souvent déjà montée via le cryptex système iOS 17+.
        }

        var newServer: OpaquePointer?
        try check(
            remote_server_connect_rsd(newAdapter, newHandshake, &newServer),
            "connexion au serveur développeur"
        )
        server = newServer

        var newSimulation: OpaquePointer?
        try check(
            location_simulation_new(newServer, &newSimulation),
            "ouverture du service de simulation GPS"
        )
        simulation = newSimulation
    }

    func setLocation(lat: Double, lng: Double) async throws {
        guard lat.isFinite, lng.isFinite else {
            throw IDeviceLocationError.invalidCoordinate
        }

        guard let simulation else {
            throw IDeviceLocationError.notConnected
        }

        try check(
            location_simulation_set(simulation, lat, lng),
            "envoi de la position GPS"
        )
    }

    func clearLocation() async throws {
        guard let simulation else {
            throw IDeviceLocationError.notConnected
        }

        try check(location_simulation_clear(simulation), "retour au GPS réel")
    }

    func shutdown() async {
        if let simulation {
            location_simulation_free(simulation)
        }
        if let server {
            remote_server_free(server)
        }
        if let handshake {
            rsd_handshake_free(handshake)
        }
        if let adapter {
            adapter_free(adapter)
        }

        simulation = nil
        server = nil
        handshake = nil
        adapter = nil
    }

    private func mountDeveloperImageIfNeeded(
        adapter: OpaquePointer?,
        handshake: OpaquePointer?
    ) throws {
        var mounter: OpaquePointer?
        try check(
            image_mounter_connect_rsd(adapter, handshake, &mounter),
            "connexion au monteur d'image",
            reportsHealth: false
        )
        defer {
            if let mounter {
                image_mounter_free(mounter)
            }
        }

        for imageType in ["Personalized", "DeveloperDiskImage", "Developer"] {
            var signature: UnsafeMutablePointer<UInt8>?
            var signatureLength = 0
            let lookup = imageType.withCString {
                image_mounter_lookup_image(mounter, $0, &signature, &signatureLength)
            }

            if let lookup {
                idevice_error_free(lookup)
                continue
            }

            if signatureLength > 0 {
                if let signature {
                    free(signature)
                }
                return
            }
        }

        guard let files = developerImageFiles() else {
            return
        }

        let chipID = try uniqueChipID(mounter: mounter)

        try files.image.withUnsafeBytes { imageBytes in
            try files.trustCache.withUnsafeBytes { trustBytes in
                try files.manifest.withUnsafeBytes { manifestBytes in
                    try check(
                        image_mounter_mount_personalized_with_callback_rsd(
                            mounter,
                            adapter,
                            handshake,
                            imageBytes.bindMemory(to: UInt8.self).baseAddress,
                            files.image.count,
                            trustBytes.bindMemory(to: UInt8.self).baseAddress,
                            files.trustCache.count,
                            manifestBytes.bindMemory(to: UInt8.self).baseAddress,
                            files.manifest.count,
                            nil,
                            chipID,
                            mountProgressCallback,
                            nil
                        ),
                        "montage de l'image développeur",
                        reportsHealth: false
                    )
                }
            }
        }
    }

    private func uniqueChipID(mounter: OpaquePointer?) throws -> UInt64 {
        var identifiers: plist_t?
        try check(
            "Developer".withCString {
                image_mounter_query_personalization_identifiers(mounter, $0, &identifiers)
            },
            "lecture des identifiants de personnalisation"
        )
        defer {
            if let identifiers {
                plist_free(identifiers)
            }
        }

        guard let identifiers,
              let item = "UniqueChipID".withCString({ plist_dict_get_item(identifiers, $0) })
        else {
            throw IDeviceLocationError.tunnelFailed("Identifiant puce introuvable")
        }

        var value: UInt64 = 0
        plist_get_uint_val(item, &value)
        return value
    }

    private struct DeveloperImageFiles {
        var image: Data
        var trustCache: Data
        var manifest: Data
    }

    private nonisolated func developerImageFiles() -> DeveloperImageFiles? {
        guard let documents = FileManager.default.urls(
            for: .documentDirectory,
            in: .userDomainMask
        ).first else {
            return nil
        }

        func read(_ name: String) -> Data? {
            try? Data(contentsOf: documents.appendingPathComponent(name))
        }

        guard let image = read("Image.dmg"),
              let trustCache = read("Image.dmg.trustcache"),
              let manifest = read("BuildManifest.plist") else {
            return nil
        }

        return DeveloperImageFiles(image: image, trustCache: trustCache, manifest: manifest)
    }

    private func check(
        _ error: UnsafeMutablePointer<IdeviceFfiError>?,
        _ what: String,
        reportsHealth: Bool = true
    ) throws {
        guard let error else {
            return
        }

        let message = error.pointee.message.map { String(cString: $0) } ?? "erreur \(error.pointee.code)"
        idevice_error_free(error)

        if reportsHealth {
            throw IDeviceLocationError.tunnelFailed("\(what) — \(message)")
        }

        throw IDeviceLocationError.tunnelFailed("\(what) — \(message)")
    }
}

private let mountProgressCallback: @convention(c) (Int, Int, UnsafeMutableRawPointer?) -> Void = {
    _, _, _ in
}
