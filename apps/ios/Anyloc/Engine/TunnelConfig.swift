import Foundation

enum TunnelConfig {
    static let defaultIP = "10.7.0.1"
    static let defaultPort: UInt16 = 49152

    static var targetIP: String {
        let stored = UserDefaults.standard.string(forKey: "anyloc.targetDeviceIP")
        let trimmed = stored?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? defaultIP : trimmed
    }
}
