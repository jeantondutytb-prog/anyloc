import Foundation
import UIKit
import UniformTypeIdentifiers

enum PairingStoreError: LocalizedError {
    case invalidPairingFile
    case noClipboardPairing
    case noServerPairing

    var errorDescription: String? {
        switch self {
        case .invalidPairingFile:
            return "Fichier de pairing invalide"
        case .noClipboardPairing:
            return "Aucun fichier de pairing dans le presse-papier"
        case .noServerPairing:
            return "Aucun pairing disponible sur le serveur. Lance Anyloc Setup sur ton ordi."
        }
    }
}

@MainActor
final class PairingStore: ObservableObject {
    @Published private(set) var hasPairing: Bool = false

    private let fileName = "rp_pairing_file.plist"

    private var directoryURL: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Pairing", isDirectory: true)
    }

    private var fileURL: URL {
        directoryURL.appendingPathComponent(fileName)
    }

    var pairingPath: String? {
        FileManager.default.fileExists(atPath: fileURL.path) ? fileURL.path : nil
    }

    init() {
        checkPairing()
    }

    func checkPairing() {
        hasPairing = FileManager.default.fileExists(atPath: fileURL.path)
    }

    func importPairing(from url: URL) throws {
        let accessed = url.startAccessingSecurityScopedResource()
        defer {
            if accessed {
                url.stopAccessingSecurityScopedResource()
            }
        }

        let data = try Data(contentsOf: url)
        try savePairingData(data)
    }

    func importPairingFromClipboard() throws {
        let pasteboard = UIPasteboard.general
        let data = pasteboard.data(forPasteboardType: "com.apple.property-list")
            ?? pasteboard.string?.data(using: .utf8)

        guard let data else {
            throw PairingStoreError.noClipboardPairing
        }

        try savePairingData(data)
    }

    func deletePairing() {
        if FileManager.default.fileExists(atPath: fileURL.path) {
            try? FileManager.default.removeItem(at: fileURL)
        }
        hasPairing = false
    }

    func downloadPairingFromServer(api: AnylocAPI) async throws {
        guard let data = try await api.fetchPairing() else {
            throw PairingStoreError.noServerPairing
        }

        try savePairingData(data)
    }

    private func savePairingData(_ data: Data) throws {
        do {
            _ = try PropertyListSerialization.propertyList(from: data, options: [], format: nil)
        } catch {
            throw PairingStoreError.invalidPairingFile
        }

        try FileManager.default.createDirectory(at: directoryURL, withIntermediateDirectories: true)
        try data.write(to: fileURL, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        try FileManager.default.setAttributes(
            [.posixPermissions: NSNumber(value: 0o600)],
            ofItemAtPath: fileURL.path
        )
        hasPairing = true
    }
}
