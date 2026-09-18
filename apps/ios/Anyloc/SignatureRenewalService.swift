import Foundation
import Network
import UIKit

struct PairingSessionResponse: Decodable {
    let ok: Bool
    let hasPairing: Bool
    let pairing: String?
}

enum SignatureRenewalState: Equatable {
    case healthy(daysRemaining: Int)
    case soon(daysRemaining: Int)
    case expired
    case unknown
}

@MainActor
final class SignatureRenewalService: ObservableObject {
    static let shared = SignatureRenewalService()

    static let signatureLifetimeDays = 7
    static let localDevVpnAppStoreURL = URL(string: "https://apps.apple.com/app/localdevvpn/id6755608044")!
    static let renewalHelpURL = URL(string: "https://www.anyloc.io/dashboard/installation?platform=ios")!

    @Published private(set) var state: SignatureRenewalState = .unknown
    @Published private(set) var hasPairingOnServer = false
    @Published private(set) var isRefreshingPairing = false
    @Published private(set) var lastRenewalAttemptAt: Date?
    @Published private(set) var pairingSavedLocally = false
    @Published var statusMessage: String?

    private let apiBaseURL = URL(string: "https://www.anyloc.io")!
    private let monitor = NWPathMonitor()
    private var isOnWifi = false

    private init() {
        restoreInstallDateIfNeeded()
        restoreRenewalAttempt()
        updateState()
        startNetworkMonitor()
    }

    var shouldShowBanner: Bool {
        switch state {
        case .soon, .expired:
            return true
        default:
            return false
        }
    }

    func markInstalledNow() {
        UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: Keys.installedAt)
        updateState()
    }

    func refreshPairingStatus() async {
        guard let session = AuthService.shared.session else {
            hasPairingOnServer = false
            return
        }

        isRefreshingPairing = true
        defer { isRefreshingPairing = false }

        var request = URLRequest(url: apiBaseURL.appendingPathComponent("/api/device/pairing/me"))
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                hasPairingOnServer = false
                return
            }

            let decoded = try JSONDecoder().decode(PairingSessionResponse.self, from: data)
            hasPairingOnServer = decoded.hasPairing

            if let pairing = decoded.pairing, !pairing.isEmpty {
                pairingSavedLocally = savePairingLocally(base64: pairing)
            }
        } catch {
            print("[Anyloc] Pairing status failed:", error.localizedDescription)
        }
    }

    func performRenewalFlow() async -> Bool {
        statusMessage = nil

        guard isOnWifi else {
            statusMessage = "Connecte ton iPhone au Wi-Fi avant de renouveler."
            return false
        }

        await refreshPairingStatus()

        if !hasPairingOnServer {
            statusMessage =
                "Pairing manquant. Ouvre Anyloc sur ton ordinateur, branche l'iPhone en USB une fois, puis réessaie."
            return false
        }

        lastRenewalAttemptAt = Date()
        UserDefaults.standard.set(lastRenewalAttemptAt!.timeIntervalSince1970, forKey: Keys.lastRenewalAttemptAt)
        markInstalledNow()
        statusMessage = "Étapes prêtes. Ouvre LocalDevVPN, appuie sur Connect, puis relance Anyloc."
        return true
    }

    func openLocalDevVpnStore() {
        UIApplication.shared.open(Self.localDevVpnAppStoreURL)
    }

    func openRenewalHelp() {
        UIApplication.shared.open(Self.renewalHelpURL)
    }

    private func restoreInstallDateIfNeeded() {
        if UserDefaults.standard.object(forKey: Keys.installedAt) == nil {
            markInstalledNow()
        }
    }

    private func restoreRenewalAttempt() {
        let timestamp = UserDefaults.standard.double(forKey: Keys.lastRenewalAttemptAt)
        if timestamp > 0 {
            lastRenewalAttemptAt = Date(timeIntervalSince1970: timestamp)
        }
    }

    private func updateState() {
        let installedAt = Date(timeIntervalSince1970: UserDefaults.standard.double(forKey: Keys.installedAt))
        let elapsedDays = Calendar.current.dateComponents([.day], from: installedAt, to: Date()).day ?? 0
        let remaining = max(0, Self.signatureLifetimeDays - elapsedDays)

        if remaining == 0 {
            state = .expired
        } else if remaining <= 2 {
            state = .soon(daysRemaining: remaining)
        } else {
            state = .healthy(daysRemaining: remaining)
        }
    }

    private func startNetworkMonitor() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor in
                self?.isOnWifi = path.status == .satisfied && path.usesInterfaceType(.wifi)
            }
        }
        monitor.start(queue: DispatchQueue(label: "anyloc.network"))
    }

    @discardableResult
    private func savePairingLocally(base64: String) -> Bool {
        guard let data = Data(base64Encoded: base64) else {
            return false
        }

        let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
        guard let fileURL = directory?.appendingPathComponent("AnylocPairing.plist") else {
            return false
        }

        do {
            try data.write(to: fileURL, options: .atomic)
            return true
        } catch {
            print("[Anyloc] Pairing save failed:", error.localizedDescription)
            return false
        }
    }

    private enum Keys {
        static let installedAt = "anyloc.signatureInstalledAt"
        static let lastRenewalAttemptAt = "anyloc.lastRenewalAttemptAt"
    }
}
