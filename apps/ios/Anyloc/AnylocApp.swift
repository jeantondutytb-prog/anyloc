import SwiftUI

@main
struct AnylocApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .task {
                    appState.autoStartIfConfigured()
                }
                .onOpenURL { url in
                    appState.handleDeepLink(url)
                }
        }
    }
}
