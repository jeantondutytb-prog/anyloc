import SwiftUI

struct MainTabView: View {
    @State private var showRenewal = false

    var body: some View {
        // The keyboard must slide over the map screen, never push it up. A plain
        // `ignoresSafeArea(.keyboard)` still let the layout shift; laying the screen
        // out inside a GeometryReader that ignores the keyboard pins it in place.
        GeometryReader { _ in
            VStack(spacing: 0) {
                RenewalBanner(showRenewal: $showRenewal)
                MapHomeView()
            }
        }
        .ignoresSafeArea(.keyboard, edges: .bottom)
        .background(Theme.Dark.bg.ignoresSafeArea())
        .sheet(isPresented: $showRenewal) {
            RenewalView()
        }
        .task {
            await SignatureRenewalService.shared.refreshPairingStatus()
        }
    }
}
