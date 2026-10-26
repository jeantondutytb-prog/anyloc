import CoreLocation
import CryptoKit
import Foundation
import IDevice
import Network

/// Drives the iPhone's own location simulation without a computer.
///
/// LocalDevVPN loops 10.7.0.1 back to the iPhone, so with a RemotePairing
/// record the app can talk to its own developer services: RemotePairing
/// tunnel (see RemotePairingPort) → RSD → DVT LocationSimulation. iOS 26.4+ drops the
/// older lockdown TLS sessions over LocalDevVPN ("Broken pipe"), so lockdown
/// pairing records are not used here. The simulated location only lasts while that DVT
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

    /// Replaced when a call hangs: its thread stays stuck, so a fresh one takes over.
    private var session = DeviceSession()
    private let keeper = BackgroundKeeper()
    /// One connection attempt at a time (warm-up and a tap can overlap).
    private var connecting: Task<Void, Never>?
    /// The fake position currently held, re-sent whenever the tunnel drops.
    private var applied: (lat: Double, lng: Double)?
    private var heartbeat: Task<Void, Never>?

    /// Where Anyloc Setup drops the RemotePairing record (the only folder it can write).
    private static let droppedPairingURL: URL = FileManager.default
        .urls(for: .documentDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("AnylocRemotePairing.plist")

    /// The pairing record grants developer access to this iPhone: keep it out of
    /// Documents (backed up to iCloud, visible over USB file sharing) and
    /// encrypted while the phone is locked before first unlock.
    static let pairingURL: URL = FileManager.default
        .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("AnylocRemotePairing.plist")

    /// Migrates pairing files saved under the old name ``AnylocPairing.plist``.
    private static func migrateLegacyPairing() {
        let fileManager = FileManager.default
        let legacyNames = ["AnylocPairing.plist"]
        let directories: [(URL, URL)] = [
            (droppedPairingURL.deletingLastPathComponent(), droppedPairingURL),
            (pairingURL.deletingLastPathComponent(), pairingURL),
        ]
        for (dir, correctURL) in directories {
            guard !fileManager.fileExists(atPath: correctURL.path) else { continue }
            for name in legacyNames {
                let legacy = dir.appendingPathComponent(name)
                guard fileManager.fileExists(atPath: legacy.path) else { continue }
                try? fileManager.moveItem(at: legacy, to: correctURL)
                break
            }
        }
    }

    /// RemotePairing records (what idevice reads and writes) carry an Ed25519
    /// key pair and a host identifier. Lockdown records (HostCertificate,
    /// HostPrivateKey…), pushed or uploaded by older Anyloc Setup versions,
    /// can't open the tunnel and only fail with "Pairing invalide".
    static func isRemotePairingRecord(_ data: Data) -> Bool {
        guard let plist = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any] else {
            return false
        }
        return plist["private_key"] is Data && plist["public_key"] is Data && plist["identifier"] is String
    }

    /// Deletes a record the tunnel can't use, so the app falls back to the
    /// computer sync (and a fresh USB drop or server copy can take its place).
    private static func discardIfUnusable(_ url: URL) {
        guard let data = try? Data(contentsOf: url), !isRemotePairingRecord(data) else { return }
        try? FileManager.default.removeItem(at: url)
        trace("Pairing illisible ignoré (\(url.lastPathComponent))")
    }

    /// Moves a freshly dropped record to its protected location.
    private static func securePairingDrop() {
        let fileManager = FileManager.default
        migrateLegacyPairing()
        discardIfUnusable(droppedPairingURL)
        discardIfUnusable(pairingURL)
        guard fileManager.fileExists(atPath: droppedPairingURL.path) else { return }
        do {
            try fileManager.createDirectory(
                at: pairingURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            if fileManager.fileExists(atPath: pairingURL.path) {
                try fileManager.removeItem(at: pairingURL)
            }
            try fileManager.moveItem(at: droppedPairingURL, to: pairingURL)
            try protectPairing()
        } catch {
            // Leave the drop where it is: it is retried on the next check.
        }
    }

    private static func protectPairing() throws {
        try FileManager.default.setAttributes(
            [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
            ofItemAtPath: pairingURL.path)
        var url = pairingURL
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try url.setResourceValues(values)
    }

    /// The tunnel call may rewrite the record (a fresh pair-setup): keep the new one.
    private static func savePairing(_ data: Data) {
        do {
            try data.write(to: pairingURL, options: .atomic)
            try protectPairing()
        } catch {
            AppErrorReporter.report("ondevice/pairing-save", error)
        }
    }

    /// Opens the tunnel ahead of time (app launch / back to foreground) so the
    /// first "Définir cette position" is instant. Silent: no VPN prompt here.
    func warmUp() async {
        guard hasPairing else { return }
        log("App au premier plan")
        if applied != nil {
            // Back from another app: the tunnel may have died while we were away.
            await reapply(reason: "Retour dans l'app")
            return
        }
        guard phase != .working, !isConnected else { return }
        await connect(promptForVPN: false)
    }

    func setLocation(lat: Double, lng: Double) async throws {
        if !isConnected { await connect(promptForVPN: true) }
        guard isConnected else { throw DeviceError.message(failureMessage) }
        do {
            try await sendLocation(lat: lat, lng: lng)
        } catch {
            // The tunnel dies when iOS suspends us; reconnect once and retry.
            log("Tunnel perdu, reconnexion")
            await reset()
            await connect(promptForVPN: true)
            guard isConnected else { throw DeviceError.message(failureMessage) }
            try await sendLocation(lat: lat, lng: lng)
        }
        applied = (lat, lng)
        keeper.start()
        startHeartbeat()
        log(String(format: "Position → %.5f, %.5f", lat, lng))
    }

    /// While a position is held, re-send it every few seconds. The simulated
    /// location vanishes as soon as the DVT connection closes, so this both keeps
    /// the connection busy and rebuilds it (and the position) when it dropped
    /// while the user was in another app.
    private func startHeartbeat() {
        heartbeat?.cancel()
        heartbeat = Task { [weak self] in
            var tick = 0
            while !Task.isCancelled {
                // Short beat: if the tunnel drops, the real position only shows for a few seconds.
                try? await Task.sleep(nanoseconds: 4_000_000_000)
                guard !Task.isCancelled, let self else { return }
                tick += 1
                await self.reapply(reason: tick % 15 == 0 ? "Renvoi périodique #\(tick)" : nil)
            }
        }
    }

    private func reapply(reason: String?) async {
        guard let applied, phase != .working else { return }
        if let reason { log(reason) }
        if isConnected, (try? await sendLocation(lat: applied.lat, lng: applied.lng)) != nil { return }
        log("Position perdue, reconnexion")
        await reset()
        await connect(promptForVPN: false)
        // Re-read: a new teleport may have landed during the reconnection, and
        // sending the old point now would override it until the next beat.
        guard isConnected, let current = self.applied else {
            AppErrorReporter.report("ondevice/reconnect", message: failureMessage)
            return
        }
        do {
            try await sendLocation(lat: current.lat, lng: current.lng)
            log("Position rétablie")
        } catch {
            AppErrorReporter.report("ondevice/resend", error)
        }
    }

    func clearLocation() async {
        applied = nil
        heartbeat?.cancel()
        heartbeat = nil
        let session = session
        try? await deadline(5, "Effacement de la position") { try await session.clearLocation() }
        await reset()
        keeper.stop()
        phase = .idle
        log("Position réelle rétablie")
    }

    private var failureMessage: String {
        if case .failed(let message) = phase { return message }
        return "Connexion impossible"
    }

    private func sendLocation(lat: Double, lng: Double) async throws {
        let session = session
        try await deadline(8, "Envoi de la position") { try await session.setLocation(lat: lat, lng: lng) }
    }

    private func connect(promptForVPN: Bool) async {
        if let connecting {
            await connecting.value
            // A silent warm-up just failed: the user tapped, so try once more for real.
            if isConnected || !promptForVPN { return }
        }
        let task = Task { await performConnect(promptForVPN: promptForVPN) }
        connecting = task
        await task.value
        connecting = nil
    }

    private func performConnect(promptForVPN: Bool) async {
        Self.securePairingDrop()
        guard let pairing = try? Data(contentsOf: Self.pairingURL) else { return }
        phase = .working
        let session = session
        do {
            try await openTunnel(pairing: pairing, promptForVPN: promptForVPN)
            let mounted = try await deadline(10, "Vérification de l'image développeur") {
                try await session.isDeveloperImageMounted()
            }
            if !mounted {
                log("Montage de l'image développeur")
                let files = try await DeveloperImage.fetch { [weak self] msg in
                    Task { @MainActor in self?.log(msg) }
                }
                try await deadline(60, "Montage de l'image développeur") { try await session.mountDeveloperImage(files) }
                // The DVT services only show up in a fresh RSD handshake.
                try await openTunnel(pairing: Self.storedPairing() ?? pairing, promptForVPN: promptForVPN)
            }

            try await deadline(15, "Ouverture de la simulation de position") { try await session.openLocationSimulation() }
            phase = .connected
            log("Prêt sans ordi")
        } catch {
            await reset()
            phase = .failed(error.localizedDescription)
            AppErrorReporter.report("ondevice/connect", error, context: ["prompt_vpn": promptForVPN])
        }
    }

    private static func storedPairing() -> Data? {
        try? Data(contentsOf: pairingURL)
    }

    private func openTunnel(pairing: Data, promptForVPN: Bool) async throws {
        let session = session
        var tried = Set<UInt16>()
        var lastError: Error = DeviceError.message("Connexion impossible")
        // Known ports first (a wrong one is refused at once), Bonjour only if they all are.
        for round in 0..<2 {
            let ports: [UInt16]
            if round == 0 {
                ports = [RemotePairingPort.lastWorking, RemotePairingPort.legacy].compactMap { $0 }
            } else {
                ports = await RemotePairingPort.discover()
                log("Ports annoncés : \(ports.map { String($0) }.joined(separator: ", "))")
            }
            for port in ports {
                guard tried.insert(port).inserted else { continue }
                do {
                    let updated = try await deadline(20, "Connexion à LocalDevVPN") {
                        try await session.openTunnel(pairing: pairing, port: port)
                    }
                    RemotePairingPort.lastWorking = port
                    needsVPN = false
                    if updated != pairing { Self.savePairing(updated) }
                    return
                } catch {
                    log("Tunnel (port \(port)) : \(error.localizedDescription)")
                    lastError = error
                    // Only a refused port is worth another one: anything else (VPN off,
                    // pair-verify) fails the same way on every port.
                    guard Self.isPortClosed(error) else { throw explain(error, promptForVPN: promptForVPN) }
                }
            }
        }
        throw explain(lastError, promptForVPN: promptForVPN)
    }

    /// Turns a tunnel failure into what the user has to do about it.
    private func explain(_ error: Error, promptForVPN: Bool) -> Error {
        if Self.isPortClosed(error) {
            // 10.7.0.1 answered, so LocalDevVPN is fine: the port wasn't found,
            // usually because Bonjour is blocked (Réseau local refusé).
            needsVPN = false
            return DeviceError.message("LocalDevVPN est bien connecté, mais l'iPhone refuse la connexion. Autorise « Réseau local » pour Anyloc (Réglages > Confidentialité et sécurité > Réseau local), puis réessaie.")
        }
        guard Self.isVPNOff(error) else { return error }
        needsVPN = promptForVPN
        return DeviceError.message("iPhone injoignable : ouvre LocalDevVPN, appuie sur Connect (Wi-Fi allumé), puis réessaie.")
    }

    /// 10.7.0.1 answered but nothing listens on that port.
    private static func isPortClosed(_ error: Error) -> Bool {
        guard case DeviceError.ffi(let message, _) = error else { return false }
        return message.contains("connect:") && !message.contains("Timeout")
    }

    /// Nothing answers on 10.7.0.1: LocalDevVPN is off (or Wi-Fi is off).
    private static func isVPNOff(_ error: Error) -> Bool {
        if case DeviceError.ffi(let message, _) = error {
            return message.contains("connect:") && message.contains("Timeout")
        }
        // The deadline fired: 10.7.0.1 never answered.
        return true
    }

    /// Drops the tunnel. If the FFI thread is stuck in a call, closing would
    /// queue behind it forever: abandon that session and start a fresh one.
    private func reset() async {
        let old = session
        do {
            try await deadline(3, "Fermeture") { await old.close() }
        } catch {
            AppErrorReporter.report("ondevice/session-stuck", message: "Session bloquée, remplacée")
            session = DeviceSession()
        }
        phase = .idle
    }

    /// Runs `body` but gives up after `seconds`: a call over a dead tunnel can
    /// block forever, and the "Application de la position…" overlay waits on it.
    private func deadline<T: Sendable>(
        _ seconds: Double, _ step: String, _ body: @escaping @Sendable () async throws -> T
    ) async throws -> T {
        let once = ResumeOnce<T>()
        return try await withCheckedThrowingContinuation { cont in
            once.set(cont)
            Task.detached {
                do { once.resume(.success(try await body())) } catch { once.resume(.failure(error)) }
            }
            Task.detached {
                try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
                once.resume(.failure(DeviceError.message("\(step) : l'iPhone ne répond pas. Vérifie que LocalDevVPN est connecté, puis réessaie.")))
            }
        }
    }

    private func log(_ line: String) {
        Self.trace(line)
    }

    nonisolated static let traceURL = FileManager.default
        .urls(for: .cachesDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("anyloc-trace.txt")

    /// Also kept in Library/Caches/anyloc-trace.txt: the console is gone once iOS
    /// suspends the app, which is exactly the moment worth seeing. The user can
    /// send it from the settings (« Envoyer le journal »).
    nonisolated static func trace(_ line: String) {
        let stamped = "\(ISO8601DateFormatter().string(from: Date())) \(line)"
        #if DEBUG
        print("[Anyloc/OnDevice] \(stamped)")
        #endif
        let url = traceURL
        guard let data = (stamped + "\n").data(using: .utf8) else { return }
        // Keep it small: start over past ~200 KB.
        if let size = (try? FileManager.default.attributesOfItem(atPath: url.path))?[.size] as? Int, size > 200_000 {
            try? FileManager.default.removeItem(at: url)
        }
        if let handle = try? FileHandle(forWritingTo: url) {
            handle.seekToEndOfFile()
            handle.write(data)
            try? handle.close()
        } else {
            try? data.write(to: url)
        }
    }
}

/// Resumes a continuation once, whichever of the call or its deadline ends first.
private final class ResumeOnce<T>: @unchecked Sendable {
    private let lock = NSLock()
    private var cont: CheckedContinuation<T, Error>?

    func set(_ cont: CheckedContinuation<T, Error>) {
        lock.lock(); self.cont = cont; lock.unlock()
    }

    func resume(_ result: Result<T, Error>) {
        lock.lock()
        let cont = self.cont
        self.cont = nil
        lock.unlock()
        cont?.resume(with: result)
    }
}

// MARK: - RemotePairing port

/// Older iOS versions served RemotePairing on 49152. iOS 26.6 picks a port at
/// boot instead, which the iPhone advertises over Bonjour as `_remotepairing._tcp`
/// (seen live: 49152 closed, 64462 open).
enum RemotePairingPort {
    static let legacy: UInt16 = 49152
    private static let lastWorkingKey = "anyloc.remotePairingPort"

    /// The port that last opened a tunnel; it holds until the iPhone reboots.
    static var lastWorking: UInt16? {
        get {
            let port = UserDefaults.standard.integer(forKey: lastWorkingKey)
            return port > 0 ? UInt16(clamping: port) : nil
        }
        set { UserDefaults.standard.set(newValue.map { Int($0) }, forKey: lastWorkingKey) }
    }

    /// Ports advertised on the Wi-Fi. Other iPhones on the same network show up
    /// too: the caller tries each against 10.7.0.1, where only ours answers.
    /// Returns nothing when « Réseau local » is refused.
    static func discover(timeout: TimeInterval = 4) async -> [UInt16] {
        let queue = DispatchQueue(label: "anyloc.remotepairing-bonjour")
        let found = FoundPorts()
        let browser = NWBrowser(for: .bonjour(type: "_remotepairing._tcp", domain: nil), using: .tcp)
        browser.browseResultsChangedHandler = { results, _ in
            for result in results {
                guard found.claim("\(result.endpoint)") else { continue }
                // Bonjour only gives a service name: connecting resolves it to host:port.
                let connection = NWConnection(to: result.endpoint, using: .tcp)
                connection.stateUpdateHandler = { [weak connection] state in
                    guard let connection else { return }
                    switch state {
                    case .ready:
                        if case .hostPort(_, let port) = connection.currentPath?.remoteEndpoint {
                            found.add(port.rawValue)
                        }
                        connection.cancel()
                    case .failed, .waiting:
                        connection.cancel()
                    default:
                        break
                    }
                }
                found.track(connection)
                connection.start(queue: queue)
            }
        }
        browser.start(queue: queue)

        // Stop shortly after the first port: the other results are other iPhones.
        let start = Date()
        var firstSeen: Date?
        while Date().timeIntervalSince(start) < timeout {
            try? await Task.sleep(nanoseconds: 250_000_000)
            if firstSeen == nil, !found.ports.isEmpty { firstSeen = Date() }
            if let firstSeen, Date().timeIntervalSince(firstSeen) > 0.5 { break }
        }
        browser.cancel()
        found.cancelResolving()
        return found.ports
    }
}

private final class FoundPorts: @unchecked Sendable {
    private let lock = NSLock()
    private var seen = Set<String>()
    private var list: [UInt16] = []
    private var connections: [NWConnection] = []

    /// Keeps a resolving connection alive until the search ends.
    func track(_ connection: NWConnection) {
        lock.lock(); defer { lock.unlock() }
        connections.append(connection)
    }

    func cancelResolving() {
        lock.lock()
        let pending = connections
        connections = []
        lock.unlock()
        pending.forEach { $0.cancel() }
    }

    /// True the first time an endpoint shows up, so each one is resolved once.
    func claim(_ endpoint: String) -> Bool {
        lock.lock(); defer { lock.unlock() }
        return seen.insert(endpoint).inserted
    }

    func add(_ port: UInt16) {
        lock.lock(); defer { lock.unlock() }
        if !list.contains(port) { list.append(port) }
    }

    var ports: [UInt16] {
        lock.lock(); defer { lock.unlock() }
        return list
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

    /// Opens the RemotePairing tunnel and its RSD handshake (pair-verify with
    /// the record Anyloc Setup made over USB). Works before the developer image
    /// is mounted, so the image is checked and mounted through it. Returns the
    /// record as the library left it, in case a pair-setup rewrote it.
    func openTunnel(pairing data: Data, port: UInt16) async throws -> Data {
        try await thread.call { [self] in
            closeAll()
            var pairingFile: OpaquePointer?
            try data.withUnsafeBytes { raw in
                try check(rp_pairing_file_from_bytes(raw.bindMemory(to: UInt8.self).baseAddress, UInt(raw.count), &pairingFile),
                          "Pairing invalide (rebranche l'iPhone à Anyloc sur l'ordinateur)")
            }
            defer { rp_pairing_file_free(pairingFile) }

            var addr = sockaddr_in()
            addr.sin_family = sa_family_t(AF_INET)
            addr.sin_port = in_port_t(port.bigEndian)
            inet_pton(AF_INET, Self.loopbackIP, &addr.sin_addr)
            try withUnsafePointer(to: &addr) { ptr in
                try ptr.withMemoryRebound(to: sockaddr.self, capacity: 1) { sa in
                    try check(tunnel_create_rppairing(
                        sa, socklen_t(MemoryLayout<sockaddr_in>.stride), "Anyloc", pairingFile,
                        nil, nil, &adapter, &handshake
                    ), "Tunnel RemotePairing")
                }
            }

            var bytes: UnsafeMutablePointer<UInt8>?
            var len: UInt = 0
            try check(rp_pairing_file_to_bytes(pairingFile, &bytes, &len), "Pairing")
            defer { idevice_data_free(bytes, len) }
            return bytes.map { Data(bytes: $0, count: Int(len)) } ?? data
        }
    }

    func isDeveloperImageMounted() async throws -> Bool {
        try await thread.call { [self] in
            var mounter: OpaquePointer?
            try check(image_mounter_connect_rsd(adapter, handshake, &mounter), "Image mounter")
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
            try check(lockdownd_connect_rsd(adapter, handshake, &lockdown), "Lockdown")
            defer { lockdownd_client_free(lockdown) }
            var value: plist_t?
            try check(lockdownd_get_value(lockdown, "UniqueChipID", nil, &value), "UniqueChipID")
            var ecid: UInt64 = 0
            plist_get_uint_val(value, &ecid)
            plist_free(value)

            var mounter: OpaquePointer?
            try check(image_mounter_connect_rsd(adapter, handshake, &mounter), "Image mounter")
            defer { image_mounter_free(mounter) }
            try files.image.withUnsafeBytes { img in
                try files.trustCache.withUnsafeBytes { tc in
                    try files.buildManifest.withUnsafeBytes { bm in
                        try check(image_mounter_mount_personalized_rsd(
                            mounter, adapter, handshake,
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
        locationSim = nil; remoteServer = nil; handshake = nil; adapter = nil
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
/// which happens when iOS suspends the app. Continuous location updates keep
/// the process (and so the tunnel) running in the background.
///
/// `CLLocationUpdate.liveUpdates` was not enough: it pauses itself once the
/// phone is stationary, iOS then suspends the app and only wakes it every
/// ~40 s, so the real position showed through in between. A classic
/// CLLocationManager with automatic pausing off never stops.
@MainActor
private final class BackgroundKeeper: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var activity: CLBackgroundActivitySession?
    private var running = false
    private var count = 0

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = kCLDistanceFilterNone
        manager.activityType = .otherNavigation
        manager.pausesLocationUpdatesAutomatically = false
        manager.showsBackgroundLocationIndicator = true
    }

    func start() {
        guard !running else { return }
        running = true
        OnDeviceLocationService.trace("Autorisation localisation : \(manager.authorizationStatus.rawValue) (0 = jamais demandée, 2 = refusée, 3 = toujours, 4 = pendant l'utilisation)")
        manager.requestWhenInUseAuthorization()
        // Must start while the app is in the foreground (it is: a tap set the position).
        activity = CLBackgroundActivitySession()
        manager.allowsBackgroundLocationUpdates = true
        manager.startUpdatingLocation()
    }

    func stop() {
        guard running else { return }
        running = false
        manager.stopUpdatingLocation()
        manager.allowsBackgroundLocationUpdates = false
        activity?.invalidate()
        activity = nil
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        Task { @MainActor in
            count += 1
            if count <= 2 || count % 200 == 0 { OnDeviceLocationService.trace("Mise à jour localisation #\(count)") }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        OnDeviceLocationService.trace("Localisation en erreur : \(error.localizedDescription)")
    }

    nonisolated func locationManagerDidPauseLocationUpdates(_ manager: CLLocationManager) {
        OnDeviceLocationService.trace("iOS a mis la localisation en pause")
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        OnDeviceLocationService.trace("Autorisation localisation changée : \(manager.authorizationStatus.rawValue)")
    }
}
