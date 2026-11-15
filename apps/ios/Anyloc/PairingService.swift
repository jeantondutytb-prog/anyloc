import Foundation

struct PairingSessionResponse: Decodable {
    let ok: Bool
    let hasPairing: Bool
    let pairing: String?
}

/// Fetches the RemotePairing record Anyloc Setup uploaded, so on-device spoofing
/// (through LocalDevVPN) works without the computer.
@MainActor
final class PairingService {
    static let shared = PairingService()

    static let localDevVpnAppStoreURL = URL(string: "https://apps.apple.com/app/localdevvpn/id6755608044")!

    private let apiBaseURL = URL(string: "https://www.anyloc.io")!

    private init() {}

    func refreshPairingStatus() async {
        guard let session = AuthService.shared.session else {
            return
        }

        var request = URLRequest(url: apiBaseURL.appendingPathComponent("/api/device/pairing/me"))
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                if status >= 500 {
                    AppErrorReporter.report("pairing/status", message: "HTTP \(status)", context: ["http_status": status])
                }
                return
            }

            let decoded = try JSONDecoder().decode(PairingSessionResponse.self, from: data)

            if let pairing = decoded.pairing, !pairing.isEmpty {
                savePairingLocally(base64: pairing)
            }
        } catch {
            AppErrorReporter.report("pairing/status", error)
        }
    }

    /// The server copy only fills in a missing record. It must never replace the
    /// local one: it can be stale (the tunnel rewrites the local record) or an
    /// old lockdown record uploaded by earlier Anyloc Setup versions, which the
    /// RemotePairing tunnel can't read ("Pairing invalide").
    @discardableResult
    private func savePairingLocally(base64: String) -> Bool {
        if OnDeviceLocationService.shared.hasPairing {
            return true
        }

        guard let data = Data(base64Encoded: base64), OnDeviceLocationService.isRemotePairingRecord(data) else {
            return false
        }

        let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
        guard let fileURL = directory?.appendingPathComponent("AnylocRemotePairing.plist") else {
            return false
        }

        do {
            try data.write(to: fileURL, options: .atomic)
            return true
        } catch {
            AppErrorReporter.report("pairing/save-local", error)
            return false
        }
    }
}
