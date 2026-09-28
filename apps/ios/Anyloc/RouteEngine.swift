import CoreLocation
import Foundation
import MapKit

// MARK: - Builder

@MainActor
final class RouteBuilder: ObservableObject {
    @Published var method: RouteMethod = .search {
        didSet { if method != oldValue { clear() } }
    }
    @Published private(set) var points: [RoutePoint] = []
    @Published private(set) var legs: [RouteLeg] = []
    @Published var speedMode: SpeedMode = .walk {
        didSet { if isDriving(speedMode) != isDriving(oldValue) { recompute() } }
    }
    @Published var customKmh: Double = 8
    @Published private(set) var isComputing = false
    @Published private(set) var gpxFileName: String?
    /// Set when the builder was loaded from a saved route, so saving updates it.
    @Published private(set) var savedRouteID: UUID?

    private var computeTask: Task<Void, Never>?

    var kmh: Double { speedMode.presetKmh ?? customKmh }
    var path: [CLLocationCoordinate2D] { legs.flatMap { $0.coords.map(\.cl) } }
    var distance: Double { legs.reduce(0) { $0 + $1.length } }
    var duration: TimeInterval { distance / (kmh / 3.6) + legs.reduce(0) { $0 + $1.pauseAfter } }
    var canStart: Bool { path.count >= 2 && !isComputing }

    func add(name: String, coord: Coord) {
        points.append(RoutePoint(name: name, coord: coord))
        recompute()
    }

    func rename(_ id: UUID, to name: String) {
        guard let i = points.firstIndex(where: { $0.id == id }) else { return }
        points[i].name = name
    }

    func remove(_ id: UUID) {
        points.removeAll { $0.id == id }
        recompute()
    }

    func removeLast() {
        guard !points.isEmpty else { return }
        points.removeLast()
        recompute()
    }

    func cyclePause(_ id: UUID) {
        guard let i = points.firstIndex(where: { $0.id == id }) else { return }
        let steps = [0, 1, 2, 5, 10]
        let next = steps.firstIndex(of: points[i].pauseMinutes).map { steps[($0 + 1) % steps.count] } ?? 0
        points[i].pauseMinutes = next
        recompute()
    }

    func clear() {
        computeTask?.cancel()
        points = []
        legs = []
        gpxFileName = nil
        savedRouteID = nil
        isComputing = false
    }

    func load(_ route: SavedRoute) {
        computeTask?.cancel()
        // Assign method first: its didSet clears everything else.
        method = route.method
        points = route.points
        legs = route.legs
        speedMode = route.speedMode
        customKmh = route.customKmh
        gpxFileName = route.method == .gpx ? route.name : nil
        savedRouteID = route.id
        isComputing = false
    }

    func makeSavedRoute(name: String, emoji: String) -> SavedRoute {
        SavedRoute(
            id: savedRouteID ?? UUID(),
            name: name,
            emoji: emoji,
            method: method,
            points: points,
            legs: legs,
            speedMode: speedMode,
            customKmh: customKmh
        )
    }

    func markSaved(_ route: SavedRoute) {
        savedRouteID = route.id
    }

    func importGPX(from url: URL) throws {
        let access = url.startAccessingSecurityScopedResource()
        defer { if access { url.stopAccessingSecurityScopedResource() } }
        let data = try Data(contentsOf: url)
        let coords = GPXParser.parse(data)
        guard coords.count >= 2 else { throw RouteError.emptyGPX }

        computeTask?.cancel()
        method = .gpx
        gpxFileName = url.deletingPathExtension().lastPathComponent
        points = [
            RoutePoint(name: "Départ", coord: coords[0]),
            RoutePoint(name: "Arrivée", coord: coords[coords.count - 1]),
        ]
        legs = [RouteLeg(coords: coords)]
    }

    // MARK: Path computation

    private func isDriving(_ mode: SpeedMode) -> Bool { mode == .drive }

    private func recompute() {
        computeTask?.cancel()
        switch method {
        case .gpx:
            return
        case .draw:
            legs = points.count >= 2 ? [RouteLeg(coords: points.map(\.coord))] : []
        case .search:
            guard points.count >= 2 else { legs = []; return }
            let snapshot = points
            let transport: MKDirectionsTransportType = speedMode == .drive ? .automobile : .walking
            isComputing = true
            computeTask = Task {
                var result: [RouteLeg] = []
                for (from, to) in zip(snapshot, snapshot.dropFirst()) {
                    let coords = await Self.directions(from: from.coord, to: to.coord, transport: transport)
                    guard !Task.isCancelled else { return }
                    let isLast = to.id == snapshot.last?.id
                    result.append(RouteLeg(coords: coords, pauseAfter: isLast ? 0 : Double(to.pauseMinutes * 60)))
                }
                legs = result
                isComputing = false
            }
        }
    }

    /// Road-following path between two points, or a straight line if Apple Maps has no route.
    private static func directions(from: Coord, to: Coord, transport: MKDirectionsTransportType) async -> [Coord] {
        let request = MKDirections.Request()
        request.source = MKMapItem(placemark: MKPlacemark(coordinate: from.cl))
        request.destination = MKMapItem(placemark: MKPlacemark(coordinate: to.cl))
        request.transportType = transport
        guard let route = try? await MKDirections(request: request).calculate().routes.first else {
            return [from, to]
        }
        let polyline = route.polyline
        var coords = [CLLocationCoordinate2D](repeating: kCLLocationCoordinate2DInvalid, count: polyline.pointCount)
        polyline.getCoordinates(&coords, range: NSRange(location: 0, length: polyline.pointCount))
        return coords.map(Coord.init)
    }
}

enum RouteError: LocalizedError {
    case emptyGPX
    var errorDescription: String? { "Ce fichier GPX ne contient pas de trajet." }
}

// MARK: - Runner

/// Walks the spoofed location along a route by pushing positions to the API
/// every few seconds. Only runs while the app is in the foreground.
@MainActor
final class RouteRunner: ObservableObject {
    static let shared = RouteRunner()

    @Published private(set) var isRunning = false
    @Published private(set) var position: Coord?
    @Published private(set) var progress: Double = 0
    @Published private(set) var remaining: TimeInterval = 0
    @Published private(set) var name = ""
    @Published var lastError: String?

    private let api = LocationAPI()
    private let tick: UInt64 = 3_000_000_000
    private var task: Task<Void, Never>?

    func start(legs: [RouteLeg], kmh: Double, name: String) {
        stop()
        let speed = kmh / 3.6
        let total = legs.reduce(0) { $0 + $1.length / speed + $1.pauseAfter }
        guard total > 0 else { return }

        self.name = name
        isRunning = true
        lastError = nil
        progress = 0
        remaining = total

        let startedAt = Date()
        task = Task {
            while !Task.isCancelled {
                let elapsed = min(Date().timeIntervalSince(startedAt), total)
                let pos = Self.position(at: elapsed, legs: legs, speed: speed)
                position = pos
                progress = elapsed / total
                remaining = total - elapsed
                do {
                    try await api.upsertLocation(name: name, lat: pos.lat, lng: pos.lng, isActive: true)
                    lastError = nil
                } catch {
                    lastError = error.localizedDescription
                }
                if elapsed >= total { break }
                try? await Task.sleep(nanoseconds: tick)
            }
            if !Task.isCancelled { isRunning = false }
        }
    }

    func stop() {
        task?.cancel()
        task = nil
        isRunning = false
    }

    private static func position(at time: TimeInterval, legs: [RouteLeg], speed: Double) -> Coord {
        var t = time
        for leg in legs {
            let legTime = leg.length / speed
            if t <= legTime { return point(along: leg.coords, meters: t * speed) }
            t -= legTime
            if t <= leg.pauseAfter { return leg.coords.last! }
            t -= leg.pauseAfter
        }
        return legs.last?.coords.last ?? Coord(lat: 0, lng: 0)
    }

    private static func point(along coords: [Coord], meters: Double) -> Coord {
        var left = meters
        for (a, b) in zip(coords, coords.dropFirst()) {
            let d = a.distance(to: b)
            if left <= d, d > 0 {
                let f = left / d
                return Coord(lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f)
            }
            left -= d
        }
        return coords.last ?? Coord(lat: 0, lng: 0)
    }
}

// MARK: - GPX

enum GPXParser {
    /// Reads track points, falling back to route points then waypoints.
    static func parse(_ data: Data) -> [Coord] {
        let delegate = Delegate()
        let parser = XMLParser(data: data)
        parser.delegate = delegate
        parser.parse()
        if !delegate.track.isEmpty { return delegate.track }
        if !delegate.route.isEmpty { return delegate.route }
        return delegate.waypoints
    }

    private final class Delegate: NSObject, XMLParserDelegate {
        var track: [Coord] = []
        var route: [Coord] = []
        var waypoints: [Coord] = []

        func parser(_ parser: XMLParser, didStartElement name: String, namespaceURI: String?,
                    qualifiedName: String?, attributes: [String: String] = [:]) {
            guard let lat = attributes["lat"].flatMap(Double.init),
                  let lon = attributes["lon"].flatMap(Double.init) else { return }
            let c = Coord(lat: lat, lng: lon)
            switch name {
            case "trkpt": track.append(c)
            case "rtept": route.append(c)
            case "wpt": waypoints.append(c)
            default: break
            }
        }
    }
}
