import CoreLocation
import CryptoKit
import Foundation
import IDevice

/// Drives the iPhone's own location simulation without a computer.
///
/// LocalDevVPN loops 10.7.0.1 back to the iPhone, so with a lockdown pairing
/// record the app can talk to its own developer services exactly like Anyloc
/// Setup does over USB/Wi-Fi: lockdown → CoreDeviceProxy tunnel → RSD →
/// DVT LocationSimulation. The simulated location only lasts while that DVT
/// connection is open, so the session is kept alive (see BackgroundKeeper).
@MainActor
final class OnDeviceLocationService: ObservableObject {
    static let shared = OnDeviceLocationService()

    enum Phase: Equatable {
        case idle
        case working
        case connected
        case failed(String)
    }

    @Published private(set) var phase: Phase = .idle
    /// Set when LocalDevVPN isn't on — the one thing the user has to do.
    @Published var needsVPN = false

    var isConnected: Bool { phase == .connected }

    /// Anyloc Setup drops this file over USB the first time the iPhone is plugged in.
    var hasPairing: Bool {
        Self.securePairingDrop()
        return FileManager.default.fileExists(atPath: Self.pairingURL.path)
    }

    private let session = DeviceSession()
    private let keeper = BackgroundKeeper()

    /// Where Anyloc Setup drops the pairing record (the only folder it can write).
    private static let droppedPairingURL: URL = FileManager.default
        .urls(for: .documentDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("AnylocPairing.plist")

    /// The pairing record grants developer access to this iPhone: keep it out of
    /// Documents (backed up to iCloud, visible over USB file sharing) and
    /// encrypted while the phone is locked before first unlock.
    static let pairingURL: URL = FileManager.default
        .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("AnylocPairing.plist")

    /// Moves a freshly dropped record to its protected location.
    private static func securePairingDrop() {
        let fileManager = FileManager.default
        guard fileManager.fileExists(atPath: droppedPairingURL.path) else { return }
        do {
            try fileManager.createDirectory(
                at: pairingURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            if fileManager.fileExists(atPath: pairingURL.path) {
                try fileManager.removeItem(at: pairingURL)
            }
            try fileManager.moveItem(at: droppedPairingURL, to: pairingURL)
            try fileManager.setAttributes(
                [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
                ofItemAtPath: pairingURL.path)
            var url = pairingURL
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            try url.setResourceValues(values)
        } catch {
            // Leave the drop where it is: it is retried on the next check.
        }
    }

    /// Opens the tunnel ahead of time (app launch / back to foreground) so the
    /// first "Définir cette position" is instant. Silent: no VPN prompt here.
    func warmUp() async {
        guard hasPairing, phase != .working, !isConnected else { return }
        await connect(promptForVPN: false)
    }

    func setLocation(lat: Double, lng: Double) async throws {
        if !isConnected { await connect(promptForVPN: true) }
        guard isConnected else { throw DeviceError.message(failureMessage) }
        do {
            try await session.setLocation(lat: lat, lng: lng)
        } catch {
            // The tunnel dies when iOS suspends us; reconnect once and retry.
            log("Tunnel perdu, reconnexion")
            await session.close()
            phase = .idle
            await connect(promptForVPN: true)
            guard isConnected else { throw error }
            try await session.setLocation(lat: lat, lng: lng)
        }
        keeper.start()
        log(String(format: "Position → %.5f, %.5f", lat, lng))
    }

    func clearLocation() async {
        try? await session.clearLocation()
        await session.close()
        keeper.stop()
        phase = .idle
        log("Position réelle rétablie")
    }

    private var failureMessage: String {
        if case .failed(let message) = phase { return message }
        return "Connexion impossible"
    }

    private func connect(promptForVPN: Bool) async {
        Self.securePairingDrop()
        guard let pairing = try? Data(contentsOf: Self.pairingURL) else { return }
        phase = .working
        do {
            do {
                try await session.openLockdown(pairing: pairing)
            } catch {
                needsVPN = promptForVPN
                throw DeviceError.message("Active LocalDevVPN puis réessaie.")
            }
            needsVPN = false

            if try await !session.isDeveloperImageMounted() {
                log("Montage de l'image développeur")
                let files = try await DeveloperImage.fetch { [weak self] msg in
                    Task { @MainActor in self?.log(msg) }
                }
                try await session.mountDeveloperImage(files)
            }

            try await session.openLocationSimulation()
            phase = .connected
            log("Prêt sans ordi")
        } catch {
            await session.close()
            phase = .failed(error.localizedDescription)
            log("Erreur : \(error.localizedDescription)")
        }
    }

    private func log(_ line: String) {
        print("[Anyloc/OnDevice] \(line)")
    }
}

// MARK: - FFI session

enum DeviceError: LocalizedError {
    case ffi(String, Int32)
    case message(String)

    var errorDescription: String? {
        switch self {
        case .ffi(let msg, let code): return "\(msg) [\(code)]"
        case .message(let msg): return msg
        }
    }
}

/// Owns the idevice handles. The library's adapter/stream handles are not
/// thread-safe, so every call runs on one dedicated thread.
private final class DeviceSession: @unchecked Sendable {
    static let loopbackIP = "10.7.0.1"

    private let thread = FFIThread()
    private var pairing: OpaquePointer?
    private var provider: OpaquePointer?
    private var adapter: OpaquePointer?
    private var handshake: OpaquePointer?
    private var remoteServer: OpaquePointer?
    private var locationSim: OpaquePointer?

    init() {
        thread.run {
            _ = idevice_init_logger(Info, Disabled, nil)
            idevice_set_global_timeout(10)
        }
    }

    func openLockdown(pairing data: Data) async throws {
        try await thread.call { [self] in
            closeAll()
            var pairingFile: OpaquePointer?
            try data.withUnsafeBytes { raw in
                try check(idevice_pairing_file_from_bytes(raw.bindMemory(to: UInt8.self).baseAddress, UInt(raw.count), &pairingFile),
                          "Pairing invalide")
            }
            pairing = pairingFile

            var addr = sockaddr_in()
            addr.sin_family = sa_family_t(AF_INET)
            addr.sin_port = in_port_t(UInt16(LOCKDOWN_PORT).bigEndian)
            inet_pton(AF_INET, Self.loopbackIP, &addr.sin_addr)
            var newProvider: OpaquePointer?
            try withUnsafePointer(to: &addr) { ptr in
                try ptr.withMemoryRebound(to: sockaddr.self, capacity: 1) { sa in
                    try check(idevice_tcp_provider_new(sa, pairingFile, "Anyloc", &newProvider),
                              "LocalDevVPN injoignable — active-le et vérifie que le Wi-Fi est allumé")
                }
            }
            provider = newProvider
        }
    }

    func isDeveloperImageMounted() async throws -> Bool {
        try await thread.call { [self] in
            var mounter: OpaquePointer?
            try check(image_mounter_connect(provider, &mounter), "Image mounter")
            defer { image_mounter_free(mounter) }
            var sig: UnsafeMutablePointer<UInt8>?
            var len: UInt = 0
            if let err = image_mounter_lookup_image(mounter, "Personalized", &sig, &len) {
                idevice_error_free(err)
                return false
            }
            if let sig { idevice_data_free(sig, len) }
            return len > 0
        }
    }

    func mountDeveloperImage(_ files: DeveloperImage.Files) async throws {
        try await thread.call { [self] in
            var lockdown: OpaquePointer?
            try check(lockdownd_connect(provider, &lockdown), "Lockdown")
            defer { lockdownd_client_free(lockdown) }
            try check(lockdownd_start_session(lockdown, pairing), "Session lockdown")
            var value: plist_t?
            try check(lockdownd_get_value(lockdown, "UniqueChipID", nil, &value), "UniqueChipID")
            var ecid: UInt64 = 0
            plist_get_uint_val(value, &ecid)
            plist_free(value)

            var mounter: OpaquePointer?
            try check(image_mounter_connect(provider, &mounter), "Image mounter")
            defer { image_mounter_free(mounter) }
            try files.image.withUnsafeBytes { img in
                try files.trustCache.withUnsafeBytes { tc in
                    try files.buildManifest.withUnsafeBytes { bm in
                        try check(image_mounter_mount_personalized(
                            mounter, provider,
                            img.bindMemory(to: UInt8.self).baseAddress, img.count,
                            tc.bindMemory(to: UInt8.self).baseAddress, tc.count,
                            bm.bindMemory(to: UInt8.self).baseAddress, bm.count,
                            nil, ecid
                        ), "Montage de l'image développeur")
                    }
                }
            }
        }
    }

    func openLocationSimulation() async throws {
        try await thread.call { [self] in
            var proxy: OpaquePointer?
            try check(core_device_proxy_connect(provider, &proxy), "CoreDeviceProxy (mode développeur activé ?)")
            var rsdPort: UInt16 = 0
            if let err = core_device_proxy_get_server_rsd_port(proxy, &rsdPort) {
                core_device_proxy_free(proxy)
                try check(err, "Port RSD")
            }
            // Consumes `proxy`.
            try check(core_device_proxy_create_tcp_adapter(proxy, &adapter), "Tunnel")
            var stream: OpaquePointer?
            try check(adapter_connect(adapter, rsdPort, &stream), "Connexion RSD")
            // Consumes `stream`.
            try check(rsd_handshake_new(stream, &handshake), "Handshake RSD")
            try check(remote_server_connect_rsd(adapter, handshake, &remoteServer), "Remote server")
            try check(location_simulation_new(remoteServer, &locationSim), "LocationSimulation")
        }
    }

    func setLocation(lat: Double, lng: Double) async throws {
        try await thread.call { [self] in
            guard locationSim != nil else { throw DeviceError.message("Simulation non ouverte") }
            try check(location_simulation_set(locationSim, lat, lng), "Envoi de la position")
        }
    }

    func clearLocation() async throws {
        try await thread.call { [self] in
            guard locationSim != nil else { return }
            try check(location_simulation_clear(locationSim), "Effacement de la position")
        }
    }

    func close() async {
        await thread.call { [self] in closeAll() }
    }

    private func closeAll() {
        if let locationSim { location_simulation_free(locationSim) }
        if let remoteServer { remote_server_free(remoteServer) }
        if let handshake { rsd_handshake_free(handshake) }
        if let adapter { adapter_free(adapter) }
        if let provider { idevice_provider_free(provider) }
        if let pairing { idevice_pairing_file_free(pairing) }
        locationSim = nil; remoteServer = nil; handshake = nil
        adapter = nil; provider = nil; pairing = nil
    }

    private func check(_ err: UnsafeMutablePointer<IdeviceFfiError>?, _ context: String) throws {
        guard let err else { return }
        let message = err.pointee.message.map { String(cString: $0) } ?? "erreur inconnue"
        let code = err.pointee.code
        idevice_error_free(err)
        throw DeviceError.ffi("\(context) : \(message)", code)
    }
}

/// A single long-lived thread that runs submitted blocks in order.
private final class FFIThread: @unchecked Sendable {
    private let condition = NSCondition()
    private var jobs: [() -> Void] = []

    init() {
        let thread = Thread { [unowned self] in self.loop() }
        thread.name = "anyloc.idevice"
        thread.qualityOfService = .userInitiated
        thread.start()
    }

    func run(_ job: @escaping () -> Void) {
        condition.lock()
        jobs.append(job)
        condition.signal()
        condition.unlock()
    }

    func call<T>(_ body: @escaping () throws -> T) async throws -> T {
        try await withCheckedThrowingContinuation { cont in
            run { cont.resume(with: Result { try body() }) }
        }
    }

    func call(_ body: @escaping () -> Void) async {
        await withCheckedContinuation { cont in
            run { body(); cont.resume() }
        }
    }

    private func loop() {
        while true {
            condition.lock()
            while jobs.isEmpty { condition.wait() }
            let job = jobs.removeFirst()
            condition.unlock()
            job()
        }
    }
}

// MARK: - Developer disk image

/// The personalized DDI is unmounted at every reboot. Same source StikDebug uses.
enum DeveloperImage {
    struct Files {
        let image: Data
        let trustCache: Data
        let buildManifest: Data
    }

    /// Pinned to one commit and checked by hash: this image is mounted as
    /// trusted developer code on the iPhone, so a changed file must not load.
    private static let base = URL(string:
        "https://github.com/doronz88/DeveloperDiskImage/raw/a719045a6470a8db988235230f6430b2b7df51fe/PersonalizedImages/Xcode_iOS_DDI_Personalized/")!

    private static let sha256: [String: String] = [
        "Image.dmg": "05fd807da5e19f030fa4941f24800c965c6c77982ab572dd5d1ef778fb69f9ca",
        "Image.dmg.trustcache": "36af60889ff5a737874a26daeb8e1a0139ebfebec6ec2e4d8f6a3c1bf1dce35c",
        "BuildManifest.plist": "8edd4a2f4f4ef1fbd7bfe49785d8badc673d1395d1d94d85b132ca8ab5ecaf54",
    ]

    private static func hasExpectedHash(_ data: Data, name: String) -> Bool {
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        return digest == sha256[name]
    }

    static func fetch(progress: @escaping (String) -> Void) async throws -> Files {
        let cache = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("DDI", isDirectory: true)
        try FileManager.default.createDirectory(at: cache, withIntermediateDirectories: true)

        func load(_ name: String) async throws -> Data {
            let local = cache.appendingPathComponent(name)
            if let data = try? Data(contentsOf: local), hasExpectedHash(data, name: name) { return data }
            progress("Téléchargement \(name)…")
            let (data, response) = try await URLSession.shared.data(from: base.appendingPathComponent(name))
            guard (response as? HTTPURLResponse)?.statusCode == 200 else {
                throw DeviceError.message("Téléchargement de \(name) impossible")
            }
            guard hasExpectedHash(data, name: name) else {
                throw DeviceError.message("\(name) ne correspond pas à l'image attendue")
            }
            try data.write(to: local, options: .atomic)
            return data
        }

        return Files(
            image: try await load("Image.dmg"),
            trustCache: try await load("Image.dmg.trustcache"),
            buildManifest: try await load("BuildManifest.plist")
        )
    }
}

// MARK: - Background keep-alive

/// The simulated location is dropped as soon as the DVT connection closes,
/// which happens when iOS suspends the app. A background location session
/// keeps the process (and so the tunnel) alive. Part of what this prototype tests.
@MainActor
private final class BackgroundKeeper {
    private let manager = CLLocationManager()
    private var activity: CLBackgroundActivitySession?
    private var updates: Task<Void, Never>?

    func start() {
        guard activity == nil else { return }
        manager.requestWhenInUseAuthorization()
        activity = CLBackgroundActivitySession()
        updates = Task {
            do {
                for try await _ in CLLocationUpdate.liveUpdates(.otherNavigation) {
                    if Task.isCancelled { break }
                }
            } catch {}
        }
    }

    func stop() {
        updates?.cancel()
        updates = nil
        activity?.invalidate()
        activity = nil
    }
}
