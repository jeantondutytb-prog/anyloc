import MapKit
import SwiftUI

struct DashboardView: View {
    @StateObject private var vm = DashboardViewModel()

    var body: some View {
        ZStack(alignment: .bottom) {
            mapView.ignoresSafeArea()

            VStack(spacing: 0) {
                searchBar
                Spacer()
            }

            bottomSheet
        }
        .preferredColorScheme(.dark)
        .task { await vm.loadCurrentLocation() }
    }

    // MARK: - Map

    private var mapView: some View {
        MapReader { proxy in
            Map(position: $vm.cameraPosition) {
                if let pos = vm.selectedPosition {
                    Annotation("", coordinate: CLLocationCoordinate2D(latitude: pos.lat, longitude: pos.lng)) {
                        Image(systemName: "mappin.circle.fill")
                            .font(.title)
                            .foregroundStyle(Theme.accent)
                    }
                }
            }
            .mapStyle(.standard(elevation: .flat, emphasis: .muted, pointsOfInterest: .excludingAll))
            .onTapGesture { point in
                if let coord = proxy.convert(point, from: .local) {
                    vm.selectPosition(lat: coord.latitude, lng: coord.longitude, name: nil)
                    Task { await vm.reverseGeocode(lat: coord.latitude, lng: coord.longitude) }
                }
            }
        }
    }

    // MARK: - Search

    private var searchBar: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(Theme.textDim)
                TextField("Rechercher un lieu...", text: $vm.searchQuery)
                    .foregroundColor(Theme.text)
                    .autocorrectionDisabled()
                    .onChange(of: vm.searchQuery) { _, _ in
                        vm.search()
                    }

                if !vm.searchQuery.isEmpty {
                    Button {
                        vm.searchQuery = ""
                        vm.searchResults = []
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(Theme.textDim)
                    }
                }
            }
            .padding(12)
            .background(Theme.bgSurface.opacity(0.92))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Theme.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 14))

            if !vm.searchResults.isEmpty {
                VStack(spacing: 0) {
                    ForEach(vm.searchResults) { result in
                        Button {
                            vm.selectPosition(lat: result.lat, lng: result.lng, name: result.name)
                            vm.cameraPosition = .region(MKCoordinateRegion(
                                center: CLLocationCoordinate2D(latitude: result.lat, longitude: result.lng),
                                span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
                            ))
                            vm.searchQuery = result.name
                            vm.searchResults = []
                        } label: {
                            Text(result.name)
                                .font(.subheadline)
                                .foregroundColor(Theme.textMuted)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 10)
                        }
                        if result.id != vm.searchResults.last?.id {
                            Divider().background(Theme.border)
                        }
                    }
                }
                .background(Theme.bgSurface.opacity(0.95))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Theme.border, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.top, 4)
            }
        }
        .padding(.horizontal)
        .padding(.top, 8)
    }

    // MARK: - Bottom Sheet

    private var bottomSheet: some View {
        VStack(spacing: 8) {
            if let pos = vm.selectedPosition {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(pos.name)
                            .font(.subheadline.bold())
                            .foregroundColor(Theme.text)
                            .lineLimit(1)
                        Text("\(pos.lat, specifier: "%.5f"), \(pos.lng, specifier: "%.5f")")
                            .font(.system(.caption2, design: .monospaced))
                            .foregroundColor(Theme.textMuted)
                    }
                    Spacer()
                    Button {
                        vm.saveFavorite()
                    } label: {
                        Image(systemName: "heart.fill")
                            .font(.caption)
                            .foregroundColor(Theme.textMuted)
                            .padding(8)
                            .background(Theme.bgSurfaceHover)
                            .clipShape(Circle())
                    }
                }

                HStack(spacing: 8) {
                    Button {
                        Task { await vm.teleport() }
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "location.fill")
                            Text(vm.isActive ? "Mettre à jour" : "Téléporter")
                        }
                        .font(.subheadline.bold())
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Theme.accent)
                        .foregroundColor(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }
                    .disabled(vm.isSaving)
                    .opacity(vm.isSaving ? 0.5 : 1)

                    if vm.isActive {
                        Button {
                            Task { await vm.stopSpoof() }
                        } label: {
                            Text("Stop")
                                .font(.subheadline.bold())
                                .padding(.vertical, 10)
                                .padding(.horizontal, 16)
                                .background(Theme.error.opacity(0.15))
                                .foregroundColor(Theme.error)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                    }
                }
            } else {
                Text("Touche la carte ou cherche un lieu")
                    .font(.subheadline)
                    .foregroundColor(Theme.textDim)
                    .padding(.vertical, 4)
            }

            if !vm.statusMessage.isEmpty {
                Text(vm.statusMessage)
                    .font(.caption.bold())
                    .foregroundColor(vm.statusIsError ? Theme.error : Theme.success)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background((vm.statusIsError ? Theme.error : Theme.success).opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .transition(.opacity)
            }

            // Favorites
            if !vm.favorites.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(vm.favorites, id: \.name) { fav in
                            Button {
                                vm.selectPosition(lat: fav.lat, lng: fav.lng, name: fav.name)
                                vm.cameraPosition = .region(MKCoordinateRegion(
                                    center: CLLocationCoordinate2D(latitude: fav.lat, longitude: fav.lng),
                                    span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
                                ))
                            } label: {
                                Text(fav.name)
                                    .font(.caption2)
                                    .foregroundColor(Theme.textMuted)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Theme.bgSurfaceHover)
                                    .clipShape(Capsule())
                            }
                        }
                    }
                }
            }

        }
        .padding(12)
        .background(Theme.bgSurface.opacity(0.95))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Theme.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .padding(.horizontal, 8)
        .padding(.bottom, 64)
    }
}

// MARK: - ViewModel

struct FavoriteLocation: Codable, Equatable {
    let name: String
    let lat: Double
    let lng: Double
}

struct SelectedPosition {
    var name: String
    var lat: Double
    var lng: Double
}

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var cameraPosition: MapCameraPosition = .region(MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 25.2, longitude: 55.27),
        span: MKCoordinateSpan(latitudeDelta: 40, longitudeDelta: 40)
    ))
    @Published var selectedPosition: SelectedPosition?
    @Published var isActive = false
    @Published var isSaving = false
    @Published var statusMessage = ""
    @Published var statusIsError = false
    @Published var searchQuery = ""
    @Published var searchResults: [NominatimResult] = []
    @Published var favorites: [FavoriteLocation] = []

    private let api = LocationAPI()
    private var searchTask: Task<Void, Never>?

    init() {
        loadFavorites()
    }

    func selectPosition(lat: Double, lng: Double, name: String?) {
        selectedPosition = SelectedPosition(
            name: name ?? String(format: "%.4f, %.4f", lat, lng),
            lat: lat,
            lng: lng
        )
    }

    func loadCurrentLocation() async {
        if let loc = try? await api.fetchLocation(), loc.isActive {
            selectedPosition = SelectedPosition(name: loc.name, lat: loc.lat, lng: loc.lng)
            isActive = true
            cameraPosition = .region(MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: loc.lat, longitude: loc.lng),
                span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
            ))
        }
    }

    func teleport() async {
        guard let pos = selectedPosition else { return }
        isSaving = true
        statusMessage = ""
        do {
            try await api.upsertLocation(name: pos.name, lat: pos.lat, lng: pos.lng, isActive: true)
            isActive = true
            showStatus("Téléporté à \(pos.name)", isError: false)
        } catch {
            showStatus(error.localizedDescription, isError: true)
        }
        isSaving = false
    }

    func stopSpoof() async {
        guard let pos = selectedPosition else { return }
        isSaving = true
        do {
            try await api.upsertLocation(name: pos.name, lat: pos.lat, lng: pos.lng, isActive: false)
            isActive = false
            showStatus("GPS réinitialisé", isError: false)
        } catch {
            showStatus(error.localizedDescription, isError: true)
        }
        isSaving = false
    }

    func search() {
        searchTask?.cancel()
        let q = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines)
        guard q.count >= 2 else { searchResults = []; return }

        searchTask = Task {
            try? await Task.sleep(nanoseconds: 350_000_000)
            guard !Task.isCancelled else { return }
            let results = (try? await api.searchPlaces(query: q)) ?? []
            if !Task.isCancelled { searchResults = results }
        }
    }

    func reverseGeocode(lat: Double, lng: Double) async {
        let url = URL(string: "https://nominatim.openstreetmap.org/reverse?lat=\(lat)&lon=\(lng)&format=json&zoom=14&addressdetails=0")!
        var request = URLRequest(url: url)
        request.setValue("fr", forHTTPHeaderField: "Accept-Language")
        request.setValue("Anyloc/1.0", forHTTPHeaderField: "User-Agent")
        guard let (data, _) = try? await URLSession.shared.data(for: request),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let displayName = json["display_name"] as? String else { return }
        let name = displayName.split(separator: ",").prefix(2).joined(separator: ",").trimmingCharacters(in: .whitespaces)
        selectedPosition?.name = name
    }

    // MARK: - Favorites

    func saveFavorite() {
        guard let pos = selectedPosition else { return }
        let fav = FavoriteLocation(name: pos.name, lat: pos.lat, lng: pos.lng)
        guard !favorites.contains(fav) else {
            showStatus("Déjà dans tes favoris", isError: false)
            return
        }
        favorites.append(fav)
        persistFavorites()
        showStatus("Favori ajouté", isError: false)
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

    private func showStatus(_ msg: String, isError: Bool) {
        statusMessage = msg
        statusIsError = isError
        Task {
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            if statusMessage == msg { statusMessage = "" }
        }
    }
}
