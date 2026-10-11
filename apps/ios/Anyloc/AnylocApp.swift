import SwiftUI

@main
struct AnylocApp: App {
    @ObservedObject private var auth = AuthService.shared
    @ObservedObject private var subscription = SubscriptionService.shared
    @Environment(\.scenePhase) private var scenePhase
    /// The launch check above already ran: skip the first "active" to avoid a double check.
    @State private var hasLaunched = false

    /// Debug-only: `-UIPreviewHome` opens the map without signing in, for simulator UI checks.
    private static var isUIPreview: Bool {
        #if DEBUG
        ProcessInfo.processInfo.arguments.contains("-UIPreviewHome")
        #else
        false
        #endif
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if Self.isUIPreview {
                    MainTabView()
                } else if !auth.isLoggedIn {
                    LoginView()
                } else if !subscription.hasCheckedOnce && subscription.isLoading {
                    ProgressView("Chargement...")
                        .tint(Theme.accentSolid)
                        .foregroundColor(Theme.text)
                } else if !subscription.hasAccess, let details = subscription.inactiveDetails {
                    SubscriptionExpiredView(details: details)
                } else {
                    MainTabView()
                }
            }
            .task {
                await auth.verifySession()
                if auth.isLoggedIn {
                    await subscription.refresh()
                }
                hasLaunched = true
            }
            .onChange(of: scenePhase) { _, phase in
                // A subscription can lapse while the app sits in the background for days.
                guard phase == .active, hasLaunched, auth.isLoggedIn else { return }
                Task {
                    await auth.verifySession()
                    if auth.isLoggedIn { await subscription.refresh() }
                }
            }
            .onChange(of: auth.isLoggedIn) { _, loggedIn in
                if loggedIn {
                    Task { await subscription.refresh() }
                } else {
                    subscription.reset()
                }
            }
        }
    }
}
