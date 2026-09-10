import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $selectedTab) {
                DashboardView()
                    .tag(0)
                SpotsView()
                    .tag(1)
                SettingsView()
                    .tag(2)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))

            // Custom tab bar
            HStack(spacing: 0) {
                tabButton(icon: "map.fill", label: "Carte", tag: 0)
                tabButton(icon: "globe.europe.africa.fill", label: "Découvrir", tag: 1)
                tabButton(icon: "person.fill", label: "Profil", tag: 2)
            }
            .padding(.horizontal, 8)
            .padding(.top, 8)
            .padding(.bottom, 4)
            .background(Theme.bgSurface.opacity(0.95))
            .overlay(
                Rectangle().fill(Theme.border).frame(height: 1),
                alignment: .top
            )
        }
        .ignoresSafeArea(.keyboard)
        .preferredColorScheme(.dark)
    }

    private func tabButton(icon: String, label: String, tag: Int) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) { selectedTab = tag }
        } label: {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 18))
                Text(label)
                    .font(.system(size: 10, weight: .medium))
            }
            .foregroundColor(selectedTab == tag ? Theme.accent : Theme.textDim)
            .frame(maxWidth: .infinity)
        }
    }
}
