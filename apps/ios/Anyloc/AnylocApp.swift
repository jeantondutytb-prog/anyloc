import SwiftUI

@main
struct AnylocApp: App {
    @ObservedObject private var auth = AuthService.shared
    @ObservedObject private var subscription = SubscriptionService.shared

    var body: some Scene {
        WindowGroup {
            Group {
                if !auth.isLoggedIn {
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
