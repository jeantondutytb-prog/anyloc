import SwiftUI

/// "Favoris" sheet: saved places, saved routes and the curated spots list.
struct SavedSheet: View {
    enum Tab: Hashable { case places, routes, discover }

    @ObservedObject private var store = FavoritesStore.shared
    @Environment(\.dismiss) private var dismiss
    @State private var tab: Tab = .places
    @State private var category = "all"
    @State private var draft: NameEmojiDraft?

    let onGoPlace: (FavoriteLocation) -> Void
    let onLaunchRoute: (SavedRoute) -> Void
    let onSpot: (Spot) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Favoris")
                .font(.system(size: 22, weight: .semibold))
                .foregroundColor(Theme.Dark.text)
                .padding(.bottom, 12)

            DarkSegmented(items: [
                .init(value: Tab.places, label: "Lieux · \(store.places.count)"),
                .init(value: Tab.routes, label: "Trajets · \(store.routes.count)"),
                .init(value: Tab.discover, label: "Découvrir"),
            ], selection: $tab, compact: true)

            switch tab {
            case .places: placesList
            case .routes: routesList
            case .discover: discover
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 22)
        .frame(maxHeight: .infinity, alignment: .top)
        .background(Theme.Dark.bg.ignoresSafeArea())
        .presentationDetents([.medium, .large])
        .presentationBackground(Theme.Dark.bg)
        .presentationDragIndicator(.visible)
        .preferredColorScheme(.dark)
        .sheet(item: $draft) { NameEmojiSheet(draft: $0) }
    }

    // MARK: Places

    @ViewBuilder
    private var placesList: some View {
        if store.places.isEmpty {
            empty(icon: "bookmark", title: "Aucun lieu enregistré",
                  subtitle: "Touche le signet sous l'adresse pour garder un lieu ici.")
        } else {
            List {
                ForEach(store.places) { place in
                    row(emoji: place.emoji ?? "📍", title: place.name,
                        subtitle: Format.coords(place.lat, place.lng), isRoute: false,
                        action: "Aller", icon: "location.fill") {
                        dismiss()
                        onGoPlace(place)
                    }
                    .swipeActions {
                        Button(role: .destructive) { store.deletePlace(place) } label: { Label("Supprimer", systemImage: "trash") }
                        Button { editPlace(place) } label: { Label("Modifier", systemImage: "pencil") }.tint(Theme.accentEnd)
                    }
                    .contextMenu {
                        Button { editPlace(place) } label: { Label("Modifier", systemImage: "pencil") }
                        Button(role: .destructive) { store.deletePlace(place) } label: { Label("Supprimer", systemImage: "trash") }
                    }
                }
            }
            .darkList()
        }
    }

    private func editPlace(_ place: FavoriteLocation) {
        draft = NameEmojiDraft(title: "Modifier le lieu", name: place.name, emoji: place.emoji ?? "📍") { name, emoji in
            var updated = place
            updated.name = name
            updated.emoji = emoji
            store.upsertPlace(updated)
        }
    }

    // MARK: Routes

    @ViewBuilder
    private var routesList: some View {
        if store.routes.isEmpty {
            empty(icon: "point.topleft.down.to.point.bottomright.curvepath", title: "Aucun trajet enregistré",
                  subtitle: "Crée un trajet puis touche le signet pour le retrouver ici.")
        } else {
            List {
                ForEach(store.routes) { route in
                    let stops = max(route.points.count - 2, 0)
                    let detail = [
                        route.method == .gpx ? "GPX" : "\(stops) étape\(stops > 1 ? "s" : "")",
                        route.speedMode.label,
                        Format.duration(route.duration),
                    ].joined(separator: " · ")
                    row(emoji: route.emoji, title: route.name, subtitle: detail, isRoute: true,
                        action: "Lancer", icon: "play.fill") {
                        dismiss()
                        onLaunchRoute(route)
                    }
                    .swipeActions {
                        Button(role: .destructive) { store.deleteRoute(route) } label: { Label("Supprimer", systemImage: "trash") }
                        Button { editRoute(route) } label: { Label("Modifier", systemImage: "pencil") }.tint(Theme.accentEnd)
                    }
                    .contextMenu {
                        Button { editRoute(route) } label: { Label("Modifier", systemImage: "pencil") }
                        Button(role: .destructive) { store.deleteRoute(route) } label: { Label("Supprimer", systemImage: "trash") }
                    }
                }
            }
            .darkList()
        }
    }

    private func editRoute(_ route: SavedRoute) {
        draft = NameEmojiDraft(title: "Modifier le trajet", name: route.name, emoji: route.emoji) { name, emoji in
            var updated = route
            updated.name = name
            updated.emoji = emoji
            store.upsertRoute(updated)
        }
    }

    // MARK: Discover

    private var discover: some View {
        VStack(alignment: .leading, spacing: 0) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(spotCategories) { cat in
                        let on = category == cat.id
                        Button { category = cat.id } label: {
                            Text(cat.label)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(on ? Theme.Dark.accent : Theme.Dark.textSoft)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 7)
                                .background(Capsule().fill(on ? Theme.Dark.accentBg : Theme.Dark.panel))
                                .overlay(Capsule().stroke(on ? Theme.Dark.accentLine : Theme.Dark.line, lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.vertical, 12)

            List {
                ForEach(allSpots.filter { category == "all" || $0.category == category }) { spot in
                    row(emoji: spot.emoji, title: spot.name, subtitle: spot.country, isRoute: false,
                        action: "Aller", icon: "location.fill") {
                        dismiss()
                        onSpot(spot)
                    }
                }
            }
            .darkList()
        }
    }

    // MARK: Pieces

    private func row(emoji: String, title: String, subtitle: String, isRoute: Bool,
                     action: String, icon: String, onTap: @escaping () -> Void) -> some View {
        HStack(spacing: 12) {
            Text(emoji)
                .font(.system(size: 22))
                .frame(width: 44, height: 44)
                .background(RoundedRectangle(cornerRadius: 13).fill(Theme.Dark.panelHigh))
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(title)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(Theme.Dark.text)
                        .lineLimit(1)
                    if isRoute {
                        Text("TRAJET")
                            .font(.system(size: 10.5, weight: .semibold))
                            .foregroundColor(Theme.Dark.violet)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(RoundedRectangle(cornerRadius: 6).fill(Theme.Dark.violetBg))
                    }
                }
                Text(subtitle)
                    .font(.system(size: 12.5))
                    .foregroundColor(Theme.Dark.muted)
                    .lineLimit(1)
            }
            Spacer(minLength: 8)
            Button(action: onTap) {
                Label(action, systemImage: icon)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Theme.Dark.accent)
                    .padding(.horizontal, 12)
                    .frame(height: 36)
                    .background(RoundedRectangle(cornerRadius: 11).fill(Theme.Dark.accentBg))
            }
            .buttonStyle(.borderless)
        }
        .padding(.vertical, 4)
        .listRowBackground(Theme.Dark.bg)
        .listRowSeparator(.hidden)
        .listRowInsets(EdgeInsets(top: 6, leading: 0, bottom: 6, trailing: 0))
    }

    private func empty(icon: String, title: String, subtitle: String) -> some View {
        VStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 30))
                .foregroundColor(Theme.Dark.dim)
            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(Theme.Dark.textSoft)
            Text(subtitle)
                .font(.system(size: 13))
                .foregroundColor(Theme.Dark.muted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 48)
        .padding(.horizontal, 24)
    }
}

private extension View {
    func darkList() -> some View {
        listStyle(.plain)
            .scrollContentBackground(.hidden)
            .padding(.top, 6)
    }
}
