import SwiftUI

@main
struct AnylocApp: App {
    @ObservedObject private var auth = AuthService.shared

    var body: some Scene {
        WindowGroup {
            Group {
                if auth.isLoggedIn {
                    MainTabView()
                } else {
                    LoginView()
                }
            }
            .animation(.easeInOut, value: auth.isLoggedIn)
            .task { await auth.verifySession() }
        }
    }
}
