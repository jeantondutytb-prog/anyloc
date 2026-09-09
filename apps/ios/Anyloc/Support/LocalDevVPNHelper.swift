import UIKit
import Darwin

enum LocalDevVPNHelper {
    static let appStoreURL = URL(string: "https://apps.apple.com/app/localdevvpn/id6755608044")!
    static let detectURL = URL(string: "localdevvpn://")!
    static let enableURL = URL(string: "localdevvpn://enable?scheme=anyloc")!

    static var isInstalled: Bool {
        UIApplication.shared.canOpenURL(detectURL)
    }

    static var isConnected: Bool {
        ipv4InterfaceAddresses().contains { $0.hasPrefix("10.7.0.") }
    }

    static func openOrInstall() {
        if isInstalled {
            UIApplication.shared.open(enableURL)
        } else {
            UIApplication.shared.open(appStoreURL)
        }
    }

    private static func ipv4InterfaceAddresses() -> [String] {
        var ifaddr: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&ifaddr) == 0, let first = ifaddr else { return [] }
        defer { freeifaddrs(ifaddr) }

        var results: [String] = []
        var ptr: UnsafeMutablePointer<ifaddrs>? = first
        while let current = ptr {
            let interface = current.pointee
            if interface.ifa_addr.pointee.sa_family == UInt8(AF_INET) {
                var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
                let nameLen = socklen_t(MemoryLayout<sockaddr_in>.size)
                if getnameinfo(
                    interface.ifa_addr,
                    nameLen,
                    &host,
                    socklen_t(host.count),
                    nil,
                    0,
                    NI_NUMERICHOST
                ) == 0 {
                    results.append(String(cString: host))
                }
            }
            ptr = interface.ifa_next
        }
        return results
    }
}
