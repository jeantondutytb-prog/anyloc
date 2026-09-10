import SwiftUI

struct FavoritesView: View {
    @StateObject private var vm = FavoritesViewModel()

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                HStack {
                    Text("Favoris")
                        .font(.title2.bold())
                        .foregroundColor(Theme.text)
                    Spacer()
                }
                .padding(.horizontal)
                .padding(.top, 16)
                .padding(.bottom, 12)

                if vm.favorites.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "heart.slash")
                            .font(.system(size: 40))
                            .foregroundColor(Theme.textDim)
                        Text("Aucun favori")
                            .font(.subheadline)
                            .foregroundColor(Theme.textDim)
                        Text("Touche le coeur sur la carte pour en ajouter")
                            .font(.caption)
                            .foregroundColor(Theme.textDim)
                    }
                    Spacer()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 8) {
                            ForEach(vm.favorites, id: \.name) { fav in
                                HStack(spacing: 12) {
                                    Image(systemName: "mappin.circle.fill")
                                        .font(.title3)
                                        .foregroundColor(Theme.accent)

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(fav.name)
                                            .font(.subheadline.bold())
                                            .foregroundColor(Theme.text)
                                            .lineLimit(1)
                                        Text("\(fav.lat, specifier: "%.4f"), \(fav.lng, specifier: "%.4f")")
                                            .font(.system(.caption2, design: .monospaced))
                                            .foregroundColor(Theme.textMuted)
                                    }

                                    Spacer()

                                    Button {
                                        Task { await vm.teleport(fav) }
                                    } label: {
                                        Text("Go")
                                            .font(.caption.bold())
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 6)
                                            .background(Theme.accent)
                                            .foregroundColor(.white)
                                            .clipShape(Capsule())
                                    }

                                    Button {
                                        vm.delete(fav)
                                    } label: {
                                        Image(systemName: "trash")
                                            .font(.caption)
                                            .foregroundColor(Theme.error)
                                    }
                                }
                                .padding(12)
                                .background(Theme.bgSurface)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Theme.border, lineWidth: 1)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 80)
                    }
                }
            }
        }
    }
}

@MainActor
final class FavoritesViewModel: ObservableObject {
    @Published var favorites: [FavoriteLocation] = []
    @Published var statusMessage = ""

    private let api = LocationAPI()

    init() {
        loadFavorites()
    }

    func teleport(_ fav: FavoriteLocation) async {
        do {
            try await api.upsertLocation(name: fav.name, lat: fav.lat, lng: fav.lng, isActive: true)
            statusMessage = "Téléporté à \(fav.name)"
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    func delete(_ fav: FavoriteLocation) {
        favorites.removeAll { $0 == fav }
        persistFavorites()
    }

    private func loadFavorites() {
        guard let data = UserDefaults.standard.data(forKey: "anyloc.favorites"),
              let saved = try? JSONDecoder().decode([FavoriteLocation].self, from: data) else { return }
        favorites = saved
    }

    private func persistFavorites() {
        if let data = try? JSONEncoder().encode(favorites) {
            UserDefaults.standard.set(data, forKey: "anyloc.favorites")
        }
    }
}
