import SwiftUI

struct SpotCategory: Identifiable {
    let id: String
    let label: String
}

struct Spot: Identifiable {
    let id = UUID()
    let name: String
    let country: String
    let lat: Double
    let lng: Double
    let category: String
    let emoji: String
}

let spotCategories: [SpotCategory] = [
    SpotCategory(id: "all", label: "Tout"),
    SpotCategory(id: "villes", label: "Villes"),
    SpotCategory(id: "plages", label: "Plages"),
    SpotCategory(id: "fetes", label: "Fêtes"),
    SpotCategory(id: "luxe", label: "Luxe"),
    SpotCategory(id: "asie", label: "Asie"),
    SpotCategory(id: "aeroports", label: "Aéroports"),
]

let allSpots: [Spot] = [
    Spot(name: "Dubai Marina", country: "Émirats", lat: 25.0805, lng: 55.1403, category: "luxe", emoji: "🇦🇪"),
    Spot(name: "Burj Khalifa", country: "Émirats", lat: 25.1972, lng: 55.2744, category: "luxe", emoji: "🇦🇪"),
    Spot(name: "Palm Jumeirah", country: "Émirats", lat: 25.1124, lng: 55.139, category: "luxe", emoji: "🇦🇪"),
    Spot(name: "Miami Beach", country: "États-Unis", lat: 25.7907, lng: -80.13, category: "plages", emoji: "🇺🇸"),
    Spot(name: "South Beach", country: "États-Unis", lat: 25.7826, lng: -80.1341, category: "plages", emoji: "🇺🇸"),
    Spot(name: "Ibiza Town", country: "Espagne", lat: 38.9067, lng: 1.4206, category: "fetes", emoji: "🇪🇸"),
    Spot(name: "Playa d'en Bossa", country: "Espagne", lat: 38.8767, lng: 1.4024, category: "fetes", emoji: "🇪🇸"),
    Spot(name: "Marbella", country: "Espagne", lat: 36.5099, lng: -4.8862, category: "plages", emoji: "🇪🇸"),
    Spot(name: "Puerto Banús", country: "Espagne", lat: 36.4848, lng: -4.9526, category: "luxe", emoji: "🇪🇸"),
    Spot(name: "Mykonos", country: "Grèce", lat: 37.4467, lng: 25.3289, category: "fetes", emoji: "🇬🇷"),
    Spot(name: "Santorin", country: "Grèce", lat: 36.3932, lng: 25.4615, category: "plages", emoji: "🇬🇷"),
    Spot(name: "Monaco", country: "Monaco", lat: 43.7384, lng: 7.4246, category: "luxe", emoji: "🇲🇨"),
    Spot(name: "Paris", country: "France", lat: 48.8584, lng: 2.2945, category: "villes", emoji: "🇫🇷"),
    Spot(name: "Saint-Tropez", country: "France", lat: 43.2727, lng: 6.6407, category: "luxe", emoji: "🇫🇷"),
    Spot(name: "Courchevel", country: "France", lat: 45.4151, lng: 6.6347, category: "luxe", emoji: "🇫🇷"),
    Spot(name: "Londres", country: "Royaume-Uni", lat: 51.5007, lng: -0.1246, category: "villes", emoji: "🇬🇧"),
    Spot(name: "New York", country: "États-Unis", lat: 40.758, lng: -73.9855, category: "villes", emoji: "🇺🇸"),
    Spot(name: "Los Angeles", country: "États-Unis", lat: 34.0195, lng: -118.4912, category: "villes", emoji: "🇺🇸"),
    Spot(name: "Las Vegas", country: "États-Unis", lat: 36.1147, lng: -115.1728, category: "fetes", emoji: "🇺🇸"),
    Spot(name: "Tokyo", country: "Japon", lat: 35.6595, lng: 139.7005, category: "asie", emoji: "🇯🇵"),
    Spot(name: "Bali", country: "Indonésie", lat: -8.6912, lng: 115.1682, category: "plages", emoji: "🇮🇩"),
    Spot(name: "Phuket", country: "Thaïlande", lat: 7.8966, lng: 98.2969, category: "plages", emoji: "🇹🇭"),
    Spot(name: "Bangkok", country: "Thaïlande", lat: 13.7397, lng: 100.5599, category: "asie", emoji: "🇹🇭"),
    Spot(name: "Singapour", country: "Singapour", lat: 1.2834, lng: 103.8607, category: "asie", emoji: "🇸🇬"),
    Spot(name: "Barcelone", country: "Espagne", lat: 41.3784, lng: 2.1925, category: "villes", emoji: "🇪🇸"),
    Spot(name: "Marrakech", country: "Maroc", lat: 31.6295, lng: -7.9811, category: "villes", emoji: "🇲🇦"),
    Spot(name: "Cancún", country: "Mexique", lat: 21.1619, lng: -86.8515, category: "plages", emoji: "🇲🇽"),
    Spot(name: "Tulum", country: "Mexique", lat: 20.2114, lng: -87.4654, category: "plages", emoji: "🇲🇽"),
    Spot(name: "Rio", country: "Brésil", lat: -22.9711, lng: -43.1822, category: "plages", emoji: "🇧🇷"),
    Spot(name: "Sydney", country: "Australie", lat: -33.8915, lng: 151.2767, category: "plages", emoji: "🇦🇺"),
    Spot(name: "CDG Paris", country: "France", lat: 49.0097, lng: 2.5479, category: "aeroports", emoji: "✈️"),
    Spot(name: "JFK New York", country: "États-Unis", lat: 40.6413, lng: -73.7781, category: "aeroports", emoji: "✈️"),
    Spot(name: "LAX Los Angeles", country: "États-Unis", lat: 33.9425, lng: -118.408, category: "aeroports", emoji: "✈️"),
    Spot(name: "DXB Dubai", country: "Émirats", lat: 25.2532, lng: 55.3657, category: "aeroports", emoji: "✈️"),
    Spot(name: "Heathrow", country: "Royaume-Uni", lat: 51.47, lng: -0.4543, category: "aeroports", emoji: "✈️"),
]

private let gridColumns = [
    GridItem(.flexible(), spacing: 10),
    GridItem(.flexible(), spacing: 10),
]

struct SpotsView: View {
    @StateObject private var vm = SpotsViewModel()

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                HStack {
                    Text("Découvrir")
                        .font(.title2.bold())
                        .foregroundColor(Theme.text)
                    Spacer()
                }
                .padding(.horizontal)
                .padding(.top, 16)
                .padding(.bottom, 12)

                // Category filter pills
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(spotCategories) { cat in
                            Button {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    vm.selectedCategory = cat.id
                                }
                            } label: {
                                Text(cat.label)
                                    .font(.caption.bold())
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 7)
                                    .background(vm.selectedCategory == cat.id ? Theme.accent : Theme.bgSurfaceHover)
                                    .foregroundColor(vm.selectedCategory == cat.id ? .white : Theme.textMuted)
                                    .clipShape(Capsule())
                                    .overlay(
                                        Capsule().stroke(
                                            vm.selectedCategory == cat.id ? Color.clear : Theme.border,
                                            lineWidth: 1
                                        )
                                    )
                            }
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.bottom, 12)

                // Grid
                ScrollView {
                    LazyVGrid(columns: gridColumns, spacing: 10) {
                        ForEach(vm.filteredSpots) { spot in
                            Button {
                                Task { await vm.teleport(spot) }
                            } label: {
                                VStack(spacing: 8) {
                                    Text(spot.emoji)
                                        .font(.system(size: 36))

                                    Text(spot.name)
                                        .font(.subheadline.bold())
                                        .foregroundColor(Theme.text)
                                        .lineLimit(1)
                                        .minimumScaleFactor(0.8)

                                    Text(spot.country)
                                        .font(.caption)
                                        .foregroundColor(Theme.textDim)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .padding(.horizontal, 8)
                                .background(Theme.bgSurface)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(Theme.border, lineWidth: 1)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                            }
                            .disabled(vm.isTeleporting)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 80)
                }

                if !vm.statusMessage.isEmpty {
                    Text(vm.statusMessage)
                        .font(.caption.bold())
                        .foregroundColor(vm.statusIsError ? Theme.error : Theme.success)
                        .padding(.vertical, 8)
                        .padding(.horizontal, 16)
                        .background((vm.statusIsError ? Theme.error : Theme.success).opacity(0.12))
                        .clipShape(Capsule())
                        .padding(.bottom, 70)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
        }
        .animation(.easeInOut, value: vm.statusMessage)
    }
}

@MainActor
final class SpotsViewModel: ObservableObject {
    @Published var selectedCategory = "all"
    @Published var isTeleporting = false
    @Published var statusMessage = ""
    @Published var statusIsError = false

    private let api = LocationAPI()

    var filteredSpots: [Spot] {
        if selectedCategory == "all" { return allSpots }
        return allSpots.filter { $0.category == selectedCategory }
    }

    func teleport(_ spot: Spot) async {
        isTeleporting = true
        statusMessage = ""
        do {
            try await api.upsertLocation(name: spot.name, lat: spot.lat, lng: spot.lng, isActive: true)
            showStatus("Téléporté à \(spot.name)", isError: false)
        } catch {
            showStatus(error.localizedDescription, isError: true)
        }
        isTeleporting = false
    }

    private func showStatus(_ msg: String, isError: Bool) {
        statusMessage = msg
        statusIsError = isError
        Task {
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            if statusMessage == msg { statusMessage = "" }
        }
    }
}
