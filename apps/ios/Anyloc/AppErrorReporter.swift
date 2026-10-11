import Foundation
import SwiftUI
import UIKit

/// Sends app errors to anyloc.io (/api/app-error), where they land in PostHog on
/// the user: `print` only reaches Xcode, so without this we see nothing of what
/// goes wrong on a customer's iPhone. Never put the email or coordinates in it.
enum AppErrorReporter {
    private static let endpoint = URL(string: "https://www.anyloc.io/api/app-error")!
    /// The heartbeat retries every few seconds: one report per scope is enough.
    private static let minInterval: TimeInterval = 300
    private static let lastSent = LastSent()

    static var appVersion: String {
        let info = Bundle.main.infoDictionary
        let version = info?["CFBundleShortVersionString"] as? String ?? "?"
        let build = info?["CFBundleVersion"] as? String ?? "?"
        return "\(version) (\(build))"
    }

    static func report(_ scope: String, _ error: Error, context: [String: Any] = [:]) {
        // No network on the user's side: nothing we could fix.
        if let urlError = error as? URLError,
           [.notConnectedToInternet, .networkConnectionLost, .dataNotAllowed, .cancelled].contains(urlError.code) {
            OnDeviceLocationService.trace("\(scope) : hors ligne (\(urlError.code.rawValue))")
            return
        }
        report(scope, message: error.localizedDescription, context: context)
    }

    static func report(_ scope: String, message: String, context: [String: Any] = [:]) {
        OnDeviceLocationService.trace("⚠️ \(scope) : \(message)")
        guard lastSent.shouldSend(scope, minInterval: minInterval) else { return }

        Task { @MainActor in
            let body: [String: Any] = [
                "platform": "ios",
                "scope": scope,
                "message": message,
                "app_version": appVersion,
                "context": context.merging(["ios_version": UIDevice.current.systemVersion]) { a, _ in a },
            ]
            guard let json = try? JSONSerialization.data(withJSONObject: body) else { return }
            var request = URLRequest(url: endpoint)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            if let token = AuthService.shared.session?.accessToken {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            request.httpBody = json
            _ = try? await URLSession.shared.data(for: request)
        }
    }

    /// The trace file with a header saying who and which build it comes from,
    /// ready to be shared with support from the settings.
    @MainActor
    static func makeJournalFile() -> URL? {
        let header = """
        Anyloc iOS \(appVersion) — iOS \(UIDevice.current.systemVersion)
        Compte : \(AuthService.shared.session?.user.id ?? "non connecté")
        Exporté le \(ISO8601DateFormatter().string(from: Date()))

        """
        let trace = (try? String(contentsOf: OnDeviceLocationService.traceURL, encoding: .utf8))
            ?? "(journal vide)"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("anyloc-journal.txt")
        do {
            try (header + trace).write(to: url, atomically: true, encoding: .utf8)
            return url
        } catch {
            return nil
        }
    }
}

private final class LastSent: @unchecked Sendable {
    private let lock = NSLock()
    private var dates: [String: Date] = [:]

    func shouldSend(_ scope: String, minInterval: TimeInterval) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        if let last = dates[scope], Date().timeIntervalSince(last) < minInterval { return false }
        dates[scope] = Date()
        return true
    }
}

/// System share sheet (Mail, WhatsApp, AirDrop…) for the journal file.
struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
