import SwiftUI

struct MainTabView: View {
    @State private var showRenewal = false

    var body: some View {
        VStack(spacing: 0) {
            RenewalBanner(showRenewal: $showRenewal)
            MapHomeView()
        }
        .background(Theme.Dark.bg.ignoresSafeArea())
        .sheet(isPresented: $showRenewal) {
            RenewalView()
        }
        .task {
            await SignatureRenewalService.shared.refreshPairingStatus()
        }
    }
}
