import Foundation
import UIKit

enum SpoofStatus: Equatable {
    case idle
    case connecting
    case active
    case reconnecting
    case dropped(String)
}

@MainActor
final class SpoofSession: ObservableObject {
    @Published var status: SpoofStatus = .idle

    var isSpoofing: Bool {
        switch status {
        case .active, .reconnecting:
            return true
        case .idle, .connecting, .dropped:
            return false
        }
    }

    private var latitude: Double = 0
    private var longitude: Double = 0
    private var pairingPath: String = ""
    private var resendTimer: Timer?
    private var healthTimer: Timer?
    private var backgroundTask: UIBackgroundTaskIdentifier = .invalid
    private let keepAlive = BackgroundKeepAlive()

    func start(latitude: Double, longitude: Double, pairingPath: String) {
        self.latitude = latitude
        self.longitude = longitude
        self.pairingPath = pairingPath
        status = .connecting

        Task.detached { [latitude, longitude, pairingPath] in
            do {
                try LocationEngine.set(
                    latitude: latitude,
                    longitude: longitude,
                    pairingPath: pairingPath,
                    deviceIP: TunnelConfig.targetIP
                )
                await MainActor.run { [weak self] in
                    guard let self else { return }
                    self.status = .active
                    self.beginBackgroundTask()
                    self.keepAlive.start()
                    self.startResendTimer()
                    self.startHealthTimer()
                }
            } catch {
                await MainActor.run { [weak self] in
                    self?.status = .dropped(error.localizedDescription)
                }
            }
        }
    }

    func stop() {
        resendTimer?.invalidate()
        resendTimer = nil
        healthTimer?.invalidate()
        healthTimer = nil

        Task.detached {
            try? LocationEngine.clear()
            await MainActor.run { [weak self] in
                guard let self else { return }
                self.keepAlive.stop()
                self.endBackgroundTask()
                self.status = .idle
            }
        }
    }

    private func startResendTimer() {
        resendTimer?.invalidate()
        resendTimer = Timer.scheduledTimer(withTimeInterval: 8, repeats: true) { [weak self] _ in
            guard let self else { return }
            let latitude = self.latitude
            let longitude = self.longitude
            let pairingPath = self.pairingPath

            Task.detached {
                do {
                    try LocationEngine.set(
                        latitude: latitude,
                        longitude: longitude,
                        pairingPath: pairingPath,
                        deviceIP: TunnelConfig.targetIP
                    )
                } catch {
                    await MainActor.run { [weak self] in
                        self?.status = .dropped(error.localizedDescription)
                    }
                }
            }
        }
    }

    private func startHealthTimer() {
        healthTimer?.invalidate()
        healthTimer = Timer.scheduledTimer(withTimeInterval: 12, repeats: true) { [weak self] _ in
            guard let self, self.isSpoofing else { return }

            if !LocationEngine.isSessionActive {
                self.status = .reconnecting
                let latitude = self.latitude
                let longitude = self.longitude
                let pairingPath = self.pairingPath

                Task.detached {
                    do {
                        try LocationEngine.set(
                            latitude: latitude,
                            longitude: longitude,
                            pairingPath: pairingPath,
                            deviceIP: TunnelConfig.targetIP
                        )
                        await MainActor.run { [weak self] in
                            self?.status = .active
                        }
                    } catch {
                        await MainActor.run { [weak self] in
                            self?.status = .dropped(error.localizedDescription)
                        }
                    }
                }
            }
        }
    }

    private func beginBackgroundTask() {
        guard backgroundTask == .invalid else { return }
        backgroundTask = UIApplication.shared.beginBackgroundTask { [weak self] in
            self?.stop()
        }
    }

    private func endBackgroundTask() {
        guard backgroundTask != .invalid else { return }
        UIApplication.shared.endBackgroundTask(backgroundTask)
        backgroundTask = .invalid
    }
}
