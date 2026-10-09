import MapKit
import SwiftUI

/// Main screen: full-screen dark map with floating top bar, search and a bottom
/// panel switching between "Téléporter" and "Explorer" (the destinations).
struct MapHomeView: View {
    enum Mode: Hashable { case teleport, route, explore }

    @StateObject private var vm = MapHomeViewModel()
    @StateObject private var builder = RouteBuilder()
    @StateObject private var network = NetworkMonitor()
    @ObservedObject private var onDevice = OnDeviceLocationService.shared
    @Environment(\.scenePhase) private var scenePhase
    @ObservedObject private var runner = RouteRunner.shared
    @ObservedObject private var store = FavoritesStore.shared

    @State private var mode: Mode = .teleport
    @State private var spotCategory = "all"
    @State private var collapsed = false
    @State private var showSaved = false
    @State private var showSettings = false
    @State private var draft: NameEmojiDraft?
    @State private var sheetTop: CGFloat = 0
    @State private var mapBottom: CGFloat = 0
    @State private var bottomInset: CGFloat = 0
    @FocusState private var searchFocused: Bool

    var body: some View {
        ZStack(alignment: .top) {
            map.ignoresSafeArea()
                .onGeometryChange(for: CGFloat.self, of: { $0.frame(in: .global).maxY }) { mapBottom = $0 }

            VStack {
                Spacer()
                sheet
                    .onGeometryChange(for: CGFloat.self, of: { $0.frame(in: .global).minY }) { sheetTop = $0 }
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 6)

            VStack(spacing: 10) {
                topBar
                if showsSearch { search }
                if let banner = vm.banner {
                    TeleportBanner(banner: banner)
                        .transition(.move(edge: .top).combined(with: .opacity))
                }
                Spacer()
            }
            .padding(.horizontal, 14)
            .padding(.top, 6)
        }
        // The keyboard slides over the panel instead of pushing the whole screen up.
        .ignoresSafeArea(.keyboard, edges: .bottom)
        .onGeometryChange(for: CGFloat.self, of: { $0.safeAreaInsets.bottom }) { bottomInset = $0 }
        .animation(.spring(duration: 0.4), value: vm.banner)
        .animation(.easeInOut(duration: 0.2), value: mode)
        .preferredColorScheme(.dark)
        .task { await vm.loadCurrentLocation() }
        .task { await onDevice.warmUp() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .background { OnDeviceLocationService.trace("App en arrière-plan") }
            if phase == .active { Task { await onDevice.warmUp() } }
        }
        .alert("Active LocalDevVPN", isPresented: $onDevice.needsVPN) {
            Button("Ouvrir LocalDevVPN") {
                UIApplication.shared.open(SignatureRenewalService.localDevVpnAppStoreURL)
            }
            Button("Annuler", role: .cancel) {}
        } message: {
            Text("Ouvre LocalDevVPN, appuie sur Connect, puis reviens dans Anyloc.")
        }
        .onChange(of: runner.isRunning) { _, running in
            // The phone stays on the route's last point: show it as the active position.
            if !running, let pos = runner.position { vm.markRouteEnded(at: pos, name: runner.name) }
        }
        .onChange(of: builder.legs) { _, _ in fitRoute() }
        .onChange(of: sheetTop) { old, new in
            // Re-frame once the panel settles to a new height (points added, mode switched…).
            if mode == .route, abs(old - new) > 20 { fitRoute() }
        }
        .onChange(of: collapsed) { _, _ in
            Task {
                try? await Task.sleep(nanoseconds: 350_000_000)
                if mode == .route { fitRoute() } else if let p = vm.selected { vm.focus(p.coord) }
            }
        }
        .onChange(of: mode) { _, _ in
            vm.clearSearch()
            if mode == .route { fitRoute() } else if let p = vm.selected { vm.focus(p.coord) }
        }
        .sheet(isPresented: $showSaved) {
            SavedSheet(
                onGoPlace: { place in
                    mode = .teleport
                    Task { await vm.teleport(to: SelectedPosition(name: place.name, coord: Coord(lat: place.lat, lng: place.lng))) }
                },
                onSpot: { spot in
                    mode = .teleport
                    Task { await vm.teleport(to: SelectedPosition(name: spot.name, coord: Coord(lat: spot.lat, lng: spot.lng))) }
                }
            )
        }
        .sheet(isPresented: $showSettings) {
            SettingsView()
                .preferredColorScheme(.light)
                .presentationDragIndicator(.visible)
        }
        .sheet(item: $draft) { NameEmojiSheet(draft: $0) }
    }

    private var showsSearch: Bool {
        mode == .teleport || (builder.method == .search && !runner.isRunning)
    }

    // MARK: - Map

    private var map: some View {
        MapReader { proxy in
            Map(position: $vm.camera) {
                if let flight = vm.flight {
                    flightContent(flight)
                } else if mode == .teleport, let p = vm.selected {
                    Annotation("", coordinate: p.coord.cl, anchor: .bottom) { DroppingPin() }
                }
                if mode == .route {
                    routeContent
                }
                if let pos = runner.position, runner.isRunning || mode == .route {
                    Annotation("", coordinate: pos.cl) { RunnerDot() }
                }
            }
            .mapStyle(.standard(elevation: .realistic, emphasis: .muted, pointsOfInterest: .excludingAll))
            .mapControls {}
            .onMapCameraChange(frequency: .onEnd) { vm.lastCamera = $0.camera }
            // Keep the pin / route framed in the part of the map not covered by the floating UI.
            .safeAreaPadding(.top, showsSearch ? 138 : 74)
            .safeAreaPadding(.bottom, max(mapBottom + bottomInset - sheetTop, 0) + 4)
            // Global space: `.local` is offset by the safe-area padding above, so the
            // pin used to land a few centimetres below the finger.
            .onTapGesture(coordinateSpace: .global) { point in
                guard let c = proxy.convert(point, from: .global) else { return }
                searchFocused = false
                handleTap(Coord(c))
            }
        }
    }

    @MapContentBuilder
    private func flightContent(_ flight: TeleportFlight) -> some MapContent {
        MapPolyline(coordinates: flight.path)
            .stroke(.white.opacity(0.18), style: StrokeStyle(lineWidth: 2, lineCap: .round, dash: [4, 6]))
        let trail = flight.trail
        if trail.count > 1 {
            MapPolyline(coordinates: trail)
                .stroke(Theme.accentEnd.opacity(0.35), style: StrokeStyle(lineWidth: 10, lineCap: .round, lineJoin: .round))
            MapPolyline(coordinates: trail)
                .stroke(Theme.accentStart, style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round))
        }
        Annotation("", coordinate: flight.path[0]) {
            Circle().fill(.white.opacity(0.6)).frame(width: 9, height: 9)
        }
        Annotation("", coordinate: flight.current) { RunnerDot() }
    }

    @MapContentBuilder
    private var routeContent: some MapContent {
        let path = builder.path
        if path.count > 1 {
            MapPolyline(coordinates: path)
                .stroke(Theme.accentEnd.opacity(0.3), style: StrokeStyle(lineWidth: 10, lineCap: .round, lineJoin: .round))
            MapPolyline(coordinates: path)
                .stroke(Theme.accentStart, style: StrokeStyle(lineWidth: 4.5, lineCap: .round, lineJoin: .round))
        }
        switch builder.method {
        case .search:
            ForEach(Array(builder.points.enumerated()), id: \.element.id) { i, p in
                let isLast = i == builder.points.count - 1 && i > 0
                Annotation("", coordinate: p.coord.cl) {
                    WaypointBadge(label: i == 0 ? "A" : (isLast ? "B" : "\(i)"), isStop: i > 0 && !isLast)
                }
            }
        case .draw:
            ForEach(builder.points) { p in
                Annotation("", coordinate: p.coord.cl) {
                    Circle().fill(.white).frame(width: 10, height: 10)
                        .overlay(Circle().stroke(Theme.accentStart, lineWidth: 2.5))
                }
            }
        case .gpx:
            if let first = path.first, let last = path.last, path.count > 1 {
                Annotation("", coordinate: first) { WaypointBadge(label: "A") }
                Annotation("", coordinate: last) { WaypointBadge(label: "B") }
            }
        }
    }

    private func handleTap(_ c: Coord) {
        guard !vm.isApplying else { return }
        switch mode {
        case .teleport, .explore:
            mode = .teleport
            vm.select(c)
        case .route:
            guard !runner.isRunning else { return }
            switch builder.method {
            case .search:
                builder.add(name: Format.coords(c.lat, c.lng), coord: c)
                let id = builder.points.last?.id
                Task {
                    if let name = await vm.placeName(c), let id { builder.rename(id, to: name) }
                }
            case .draw:
                builder.add(name: "Point", coord: c)
            case .gpx:
                break
            }
        }
    }

    private func fitRoute() {
        guard mode == .route else { return }
        let coords = builder.path.isEmpty ? builder.points.map(\.coord.cl) : builder.path
        guard let first = coords.first else { return }
        if coords.count == 1 { vm.focus(Coord(first), distance: 4000); return }
        var rect = MKMapRect.null
        for c in coords {
            let p = MKMapPoint(c)
            rect = rect.union(MKMapRect(x: p.x, y: p.y, width: 0, height: 0))
        }
        let w = max(rect.width, 800), h = max(rect.height, 800)
        let padded = MKMapRect(x: rect.midX - w * 0.65, y: rect.midY - h * 0.65, width: w * 1.3, height: h * 1.3)
        withAnimation(.easeInOut(duration: 0.4)) { vm.camera = .rect(padded) }
    }

    // MARK: - Top bar + search

    private var topBar: some View {
        // Buttons on either side so the wordmark sits dead centre for screen recordings.
        HStack(spacing: 0) {
            Button { showSaved = true } label: {
                Image(systemName: "bookmark")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(Theme.Dark.accent)
                    .frame(width: 44, height: 44)
            }
            Spacer()
            // Same wordmark as the website header: Helvetica Neue bold, tight tracking.
            (Text("Anyloc").foregroundColor(Theme.Dark.text)
                + Text(".io").foregroundColor(Theme.Dark.accent))
                .font(.custom("HelveticaNeue-Bold", size: 21))
                .tracking(-0.42)
            Spacer()
            Button { showSettings = true } label: {
                Image(systemName: "gearshape.fill")
                    .font(.system(size: 18))
                    .foregroundColor(Theme.Dark.textSoft)
                    .frame(width: 44, height: 44)
            }
        }
        .padding(.horizontal, 8)
        .frame(height: 58)
        .floatingCard()
    }

    private var search: some View {
        VStack(spacing: 6) {
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(Theme.Dark.textSoft)
                TextField("", text: $vm.searchQuery,
                          prompt: Text(mode == .route ? "Ajouter un lieu au trajet" : "Rechercher une ville, une adresse, un lieu")
                            .foregroundColor(Theme.Dark.muted))
                    .focused($searchFocused)
                    .font(.system(size: 16))
                    .foregroundColor(Theme.Dark.text)
                    .autocorrectionDisabled()
                    .submitLabel(.search)
                    .onChange(of: vm.searchQuery) { _, _ in vm.search() }
                if !vm.searchQuery.isEmpty {
                    Button { vm.clearSearch() } label: {
                        Image(systemName: "xmark.circle.fill").foregroundColor(Theme.Dark.dim)
                    }
                }
            }
            .padding(.horizontal, 18)
            .frame(height: 54)
            .floatingCard()

            if !vm.results.isEmpty {
                VStack(spacing: 0) {
                    ForEach(vm.results) { r in
                        Button { pick(r) } label: {
                            HStack(spacing: 12) {
                                Image(systemName: "mappin.circle.fill").foregroundColor(Theme.Dark.accent)
                                Text(r.name)
                                    .font(.system(size: 15))
                                    .foregroundColor(Theme.Dark.textSoft)
                                    .lineLimit(1)
                                Spacer()
                            }
                            .padding(.horizontal, 16)
                            .frame(height: 46)
                        }
                        if r.id != vm.results.last?.id {
                            Rectangle().fill(Theme.Dark.line).frame(height: 1).padding(.leading, 44)
                        }
                    }
                }
                .floatingCard(radius: 16)
            }
        }
    }

    private func pick(_ r: NominatimResult) {
        let c = Coord(lat: r.lat, lng: r.lng)
        searchFocused = false
        vm.clearSearch()
        switch mode {
        case .teleport, .explore:
            vm.select(c, name: r.name)
        case .route:
            builder.method = .search
            builder.add(name: r.name, coord: c)
        }
    }

    // MARK: - Bottom panel

    private var sheet: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button { withAnimation(.spring(duration: 0.3)) { collapsed.toggle() } } label: {
                Capsule().fill(Theme.Dark.lineStrong).frame(width: 40, height: 5)
                    .frame(maxWidth: .infinity)
                    .padding(.bottom, 14)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            DarkSegmented(items: [
                .init(value: Mode.teleport, label: "Téléporter", icon: "location.fill"),
                .init(value: Mode.explore, label: "Explorer", icon: "globe.europe.africa.fill"),
            ], selection: $mode)

            if !collapsed {
                switch mode {
                case .teleport: teleportPanel
                case .route:
                    RoutePanel(builder: builder, runner: runner,
                               onAddStop: { searchFocused = true },
                               onStart: startRoute,
                               onSave: saveRoute)
                case .explore: explorePanel
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 10)
        .padding(.bottom, 16)
        .background(RoundedRectangle(cornerRadius: 28).fill(Theme.Dark.sheet))
        .overlay(RoundedRectangle(cornerRadius: 28).stroke(Theme.Dark.line, lineWidth: 1))
        .shadow(color: .black.opacity(0.4), radius: 20, y: -6)
    }

    private var teleportPanel: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let p = vm.selected {
                HStack(spacing: 10) {
                    VStack(alignment: .leading, spacing: 4) {
                        Caption(text: statusText, color: network.isOffline && !onDevice.isConnected ? Theme.error : Theme.Dark.accent)
                        Text(p.name)
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundColor(Theme.Dark.text)
                            .lineLimit(1)
                        Text(Format.coords(p.coord.lat, p.coord.lng))
                            .font(.system(size: 14, design: .monospaced))
                            .foregroundColor(Theme.Dark.muted)
                    }
                    Spacer(minLength: 6)
                    SquareIconButton(icon: store.contains(lat: p.coord.lat, lng: p.coord.lng) ? "bookmark.fill" : "bookmark") {
                        addFavorite(p)
                    }
                    SquareIconButton(icon: "location.north.fill") { vm.focus(p.coord) }
                }
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    Caption(text: readyLabel, color: network.isOffline && !onDevice.isConnected ? Theme.error : Theme.Dark.accent)
                    Text("Touche la carte ou cherche un lieu")
                        .font(.system(size: 17, weight: .medium))
                        .foregroundColor(Theme.Dark.textSoft)
                }
            }

            Rectangle().fill(Theme.Dark.line).frame(height: 1).padding(.vertical, 14)

            if isSelectedActive, let since = vm.activeSince {
                ActiveLocationBar(since: since) {
                    runner.stop()
                    Task { await vm.stop() }
                }
            } else {
                GradientCTA(title: "Définir cette position", icon: "scope",
                            isLoading: vm.isApplying,
                            isDisabled: vm.selected == nil || (network.isOffline && !onDevice.hasPairing)) {
                    runner.stop()
                    Task { await vm.teleport() }
                }

                if vm.isActive {
                    Button {
                        runner.stop()
                        Task { await vm.stop() }
                    } label: {
                        Text("Revenir à ma vraie position")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(Theme.Dark.muted)
                            .frame(maxWidth: .infinity)
                            .padding(.top, 12)
                    }
                    .buttonStyle(.plain)
                }
            }

            if let status = vm.status {
                Text(status.text)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(status.isError ? Theme.error : Theme.Dark.accent)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 10)
                    .transition(.opacity)
            }
        }
        .padding(.top, 14)
    }

    private var explorePanel: some View {
        VStack(alignment: .leading, spacing: 0) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(spotCategories) { cat in
                        let on = spotCategory == cat.id
                        Button { spotCategory = cat.id } label: {
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

            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(allSpots.filter { spotCategory == "all" || $0.category == spotCategory }) { spot in
                        Button { pickSpot(spot) } label: {
                            HStack(spacing: 12) {
                                Text(spot.emoji)
                                    .font(.system(size: 22))
                                    .frame(width: 44, height: 44)
                                    .background(RoundedRectangle(cornerRadius: 13).fill(Theme.Dark.panelHigh))
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(spot.name)
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundColor(Theme.Dark.text)
                                        .lineLimit(1)
                                    Text(spot.country)
                                        .font(.system(size: 12.5))
                                        .foregroundColor(Theme.Dark.muted)
                                        .lineLimit(1)
                                }
                                Spacer(minLength: 8)
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(Theme.Dark.dim)
                            }
                            .padding(.vertical, 6)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .frame(height: 330)
        }
    }

    private var isSelectedActive: Bool {
        vm.activeCoord != nil && vm.activeCoord == vm.selected?.coord
    }

    private var statusText: String {
        isSelectedActive ? "Position active" : readyLabel
    }

    private var readyLabel: String {
        onDevice.isConnected ? "Prêt sans ordi" : network.label
    }

    // MARK: - Actions

    private func pickSpot(_ spot: Spot) {
        mode = .teleport
        vm.select(Coord(lat: spot.lat, lng: spot.lng), name: spot.name)
    }

    private func addFavorite(_ p: SelectedPosition) {
        if let existing = store.places.first(where: { $0.lat == p.coord.lat && $0.lng == p.coord.lng }) {
            draft = NameEmojiDraft(title: "Modifier le lieu", name: existing.name, emoji: existing.emoji ?? "📍") { name, emoji in
                var updated = existing
                updated.name = name
                updated.emoji = emoji
                store.upsertPlace(updated)
            }
            return
        }
        draft = NameEmojiDraft(title: "Ajouter aux favoris", name: p.name, emoji: "📍") { name, emoji in
            store.upsertPlace(FavoriteLocation(name: name, lat: p.coord.lat, lng: p.coord.lng, emoji: emoji))
        }
    }

    private func saveRoute() {
        let existing = store.routes.first { $0.id == builder.savedRouteID }
        let fallback = builder.points.last.map { "Vers \($0.name)" } ?? "Mon trajet"
        draft = NameEmojiDraft(title: existing == nil ? "Enregistrer le trajet" : "Mettre à jour le trajet",
                               name: existing?.name ?? builder.gpxFileName ?? fallback,
                               emoji: existing?.emoji ?? "🚶") { name, emoji in
            let route = builder.makeSavedRoute(name: name, emoji: emoji)
            store.upsertRoute(route)
            builder.markSaved(route)
        }
    }

    private func startRoute() {
        let name = store.routes.first { $0.id == builder.savedRouteID }?.name
            ?? builder.points.last.map { "Vers \($0.name)" }
            ?? "Trajet"
        vm.markRouteStarted()
        runner.start(legs: builder.legs, kmh: builder.kmh, name: name)
    }
}

// MARK: - ViewModel

struct SelectedPosition: Equatable {
    var name: String
    var coord: Coord
}

@MainActor
final class MapHomeViewModel: ObservableObject {
    struct Status: Equatable {
        let text: String
        let isError: Bool
    }

    @Published var camera: MapCameraPosition = .region(MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 48.8566, longitude: 2.3522),
        span: MKCoordinateSpan(latitudeDelta: 0.2, longitudeDelta: 0.2)
    ))
    @Published private(set) var selected: SelectedPosition?
    @Published private(set) var activeCoord: Coord? {
        didSet { if activeCoord != oldValue { activeSince = activeCoord == nil ? nil : Date() } }
    }
    /// When the current fake position was applied, for the elapsed timer.
    @Published private(set) var activeSince: Date? {
        didSet { UserDefaults.standard.set(activeSince, forKey: Self.activeSinceKey) }
    }
    private static let activeSinceKey = "anyloc.activeSince"
    @Published private(set) var isApplying = false
    /// Set while the teleport animation plays: a dot flies from the old position to the new one.
    @Published private(set) var flight: TeleportFlight?
    @Published private(set) var banner: TeleportBanner.State?
    /// Where the map was last left, so the flight can take off from the current view.
    var lastCamera: MapCamera?
    @Published private(set) var status: Status?
    @Published var searchQuery = ""
    @Published private(set) var results: [NominatimResult] = []

    var isActive: Bool { activeCoord != nil }

    private let api = LocationAPI()
    private var searchTask: Task<Void, Never>?
    private var geocodeTask: Task<Void, Never>?

    func loadCurrentLocation() async {
        guard let loc = try? await api.fetchLocation(), loc.isActive else { return }
        let c = Coord(lat: loc.lat, lng: loc.lng)
        let since = UserDefaults.standard.object(forKey: Self.activeSinceKey) as? Date
        selected = SelectedPosition(name: loc.name, coord: c)
        activeCoord = c
        if let since { activeSince = since }
        focus(c)
    }

    func select(_ c: Coord, name: String? = nil) {
        selected = SelectedPosition(name: name ?? Format.coords(c.lat, c.lng), coord: c)
        focus(c)
        geocodeTask?.cancel()
        guard name == nil else { return }
        geocodeTask = Task {
            if let resolved = await placeName(c), !Task.isCancelled, selected?.coord == c {
                selected?.name = resolved
            }
        }
    }

    func focus(_ c: Coord, distance: Double = 1600, duration: Double = 0.5) {
        withAnimation(.easeInOut(duration: duration)) {
            camera = .camera(MapCamera(centerCoordinate: c.cl, distance: distance, heading: 0, pitch: 50))
        }
    }

    func teleport(to position: SelectedPosition) async {
        selected = position
        focus(position.coord)
        await teleport()
    }

    func teleport() async {
        guard let p = selected, !isApplying else { return }
        isApplying = true
        let apply = Task { try await self.apply(p) }

        banner = .flying(p.name)
        if let origin = flightOrigin(to: p.coord) {
            await fly(from: origin, to: p.coord)
        }
        let result = await apply.result
        let flew = flight != nil
        flight = nil

        switch result {
        case .success:
            activeCoord = p.coord
            if !flew { focus(p.coord) }
            banner = .arrived(p.name)
            isApplying = false
            try? await Task.sleep(nanoseconds: 2_400_000_000)
            if banner == .arrived(p.name) { banner = nil }
        case .failure(let error):
            focus(p.coord)
            banner = nil
            isApplying = false
            show(error.localizedDescription, isError: true)
        }
    }

    private func apply(_ p: SelectedPosition) async throws {
        let onDevice = OnDeviceLocationService.shared
        if onDevice.hasPairing {
            // No computer: the iPhone moves itself. The sync only keeps the
            // dashboard up to date, so it may fail (e.g. Wi-Fi with no internet).
            try await onDevice.setLocation(lat: p.coord.lat, lng: p.coord.lng)
            try? await api.upsertLocation(name: p.name, lat: p.coord.lat, lng: p.coord.lng, isActive: true)
        } else {
            try await api.upsertLocation(name: p.name, lat: p.coord.lat, lng: p.coord.lng, isActive: true)
        }
    }

    /// Where the phone currently is: the fake position if one is on, else the last fix iOS has.
    private func flightOrigin(to dest: Coord) -> Coord? {
        guard !UIAccessibility.isReduceMotionEnabled else { return nil }
        let origin = activeCoord ?? CLLocationManager().location.map { Coord($0.coordinate) }
        guard let origin, origin.distance(to: dest) > 300 else { return nil }
        return origin
    }

    /// One continuous camera move, like a plane: climb from the current view, follow
    /// the dot along the great circle (high enough to see the globe on long trips),
    /// then descend slowly onto the destination. Altitude is interpolated in log
    /// space so the zoom feels even, and the descent waits for the destination's
    /// map tiles so the landing isn't a blank, half-drawn map.
    private func fly(from origin: Coord, to dest: Coord) async {
        let meters = origin.distance(to: dest)
        let start = lastCamera ?? MapCamera(centerCoordinate: dest.cl, distance: 1600, heading: 0, pitch: 50)
        let startCenter = Coord(start.centerCoordinate)
        let landing = (distance: 1600.0, pitch: 50.0)
        // Peak altitude grows with the trip; ~6 000 km away shows the whole globe.
        let peak = min(max(meters * 1.6, 5000), 22_000_000)
        let duration = 3.4 + min(3, log10(meters / 1000 + 1) * 0.8)

        var tilesReady = false
        let prefetch = Task { await Self.prefetchTiles(at: dest, distance: landing.distance, pitch: landing.pitch) }
        Task { await prefetch.value; tilesReady = true }

        func ease(_ x: Double) -> Double {
            let x = min(max(x, 0), 1)
            return x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2
        }
        func logLerp(_ a: Double, _ b: Double, _ k: Double) -> Double { exp(log(a) + (log(b) - log(a)) * k) }

        let descentStart = 0.55, maxHold = 2.5
        var elapsed = 0.0, held = 0.0, last = Date()
        flight = TeleportFlight(origin: origin, dest: dest)
        while true {
            let now = Date(), dt = now.timeIntervalSince(last)
            last = now
            // Hover at cruise altitude until the destination is drawn (bounded).
            if elapsed / duration >= descentStart, !tilesReady, held < maxHold {
                held += dt
            } else {
                elapsed += dt
            }
            let t = min(elapsed / duration, 1)

            let travel = ease((t - 0.08) / 0.5)
            flight?.progress = travel

            let altitude: Double, pitch: Double
            if t < 0.35 {
                let k = ease(t / 0.35)
                altitude = logLerp(start.distance, peak, k)
                pitch = start.pitch * (1 - k)
            } else if t < descentStart {
                altitude = peak
                pitch = 0
            } else {
                let k = ease((t - descentStart) / (1 - descentStart))
                altitude = logLerp(peak, landing.distance, k)
                pitch = landing.pitch * k * k
            }

            // Ease the view from where it was onto the dot while climbing, then track it.
            let follow = min(1, travel / 0.3)
            let blend = follow * follow * (3 - 2 * follow)
            let dot = flight?.current ?? dest.cl
            let center = TeleportFlight.greatCircle(startCenter, Coord(dot), blend)

            camera = .camera(MapCamera(centerCoordinate: center, distance: altitude,
                                       heading: start.heading * (1 - min(1, t / 0.35)), pitch: pitch))
            if t >= 1 { break }
            try? await Task.sleep(nanoseconds: 16_000_000)
        }
        prefetch.cancel()
    }

    /// Rendering a snapshot of the landing view pulls its tiles into MapKit's cache.
    private static func prefetchTiles(at c: Coord, distance: Double, pitch: Double) async {
        let options = MKMapSnapshotter.Options()
        options.camera = MKMapCamera(lookingAtCenter: c.cl, fromDistance: distance, pitch: pitch, heading: 0)
        options.size = UIScreen.main.bounds.size
        options.preferredConfiguration = MKStandardMapConfiguration(elevationStyle: .realistic, emphasisStyle: .muted)
        options.traitCollection = UITraitCollection(userInterfaceStyle: .dark)
        _ = try? await MKMapSnapshotter(options: options).start()
    }

    func stop() async {
        guard let p = selected ?? activeCoord.map({ SelectedPosition(name: "", coord: $0) }) else { return }
        do {
            let onDevice = OnDeviceLocationService.shared
            if onDevice.hasPairing {
                await onDevice.clearLocation()
                try? await api.upsertLocation(name: p.name, lat: p.coord.lat, lng: p.coord.lng, isActive: false)
            } else {
                try await api.upsertLocation(name: p.name, lat: p.coord.lat, lng: p.coord.lng, isActive: false)
            }
            activeCoord = nil
            show("Position réelle rétablie", isError: false)
        } catch {
            show(error.localizedDescription, isError: true)
        }
    }

    func markRouteStarted() {
        // The runner now drives the location; the teleport target is no longer the active one.
        activeCoord = nil
    }

    func markRouteEnded(at c: Coord, name: String) {
        selected = SelectedPosition(name: name, coord: c)
        activeCoord = c
    }

    func search() {
        searchTask?.cancel()
        let q = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines)
        guard q.count >= 2 else { results = []; return }
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 350_000_000)
            guard !Task.isCancelled else { return }
            let found = (try? await api.searchPlaces(query: q)) ?? []
            if !Task.isCancelled { results = found }
        }
    }

    func clearSearch() {
        searchTask?.cancel()
        searchQuery = ""
        results = []
    }

    func placeName(_ c: Coord) async -> String? {
        let url = URL(string: "https://nominatim.openstreetmap.org/reverse?lat=\(c.lat)&lon=\(c.lng)&format=json&zoom=17&addressdetails=0")!
        var request = URLRequest(url: url)
        request.setValue("fr", forHTTPHeaderField: "Accept-Language")
        request.setValue("Anyloc/1.0", forHTTPHeaderField: "User-Agent")
        guard let (data, _) = try? await URLSession.shared.data(for: request),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let displayName = json["display_name"] as? String else { return nil }
        return displayName.split(separator: ",").prefix(2).joined(separator: ",").trimmingCharacters(in: .whitespaces)
    }

    private func show(_ text: String, isError: Bool) {
        let s = Status(text: text, isError: isError)
        withAnimation { status = s }
        Task {
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            if status == s { withAnimation { status = nil } }
        }
    }
}
