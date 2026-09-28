import CoreLocation
import Foundation

struct Coord: Codable, Equatable, Hashable {
    let lat: Double
    let lng: Double

    init(lat: Double, lng: Double) {
        self.lat = lat
        self.lng = lng
    }

    init(_ c: CLLocationCoordinate2D) {
        self.init(lat: c.latitude, lng: c.longitude)
    }

    var cl: CLLocationCoordinate2D { CLLocationCoordinate2D(latitude: lat, longitude: lng) }

    func distance(to other: Coord) -> Double {
        CLLocation(latitude: lat, longitude: lng).distance(from: CLLocation(latitude: other.lat, longitude: other.lng))
    }
}

struct FavoriteLocation: Codable, Equatable, Identifiable {
    var id: String { "\(lat),\(lng)" }
    var name: String
    let lat: Double
    let lng: Double
    // Optional so favorites saved before emojis existed still decode.
    var emoji: String?
}

enum RouteMethod: String, Codable, CaseIterable {
    case search, draw, gpx

    var label: String {
        switch self {
        case .search: return "Recherche"
        case .draw: return "Dessin"
        case .gpx: return "GPX"
        }
    }

    var icon: String {
        switch self {
        case .search: return "magnifyingglass"
        case .draw: return "pencil"
        case .gpx: return "doc.badge.arrow.up"
        }
    }
}

enum SpeedMode: String, Codable, CaseIterable {
    case walk, bike, drive, custom

    var label: String {
        switch self {
        case .walk: return "Marche"
        case .bike: return "Vélo"
        case .drive: return "Voiture"
        case .custom: return "Perso"
        }
    }

    var presetKmh: Double? {
        switch self {
        case .walk: return 5
        case .bike: return 15
        case .drive: return 60
        case .custom: return nil
        }
    }
}

struct RoutePoint: Codable, Equatable, Identifiable {
    var id = UUID()
    var name: String
    var coord: Coord
    var pauseMinutes: Int = 0
}

/// A stretch of path followed by an optional pause (at a stop).
struct RouteLeg: Codable, Equatable {
    var coords: [Coord]
    var pauseAfter: TimeInterval = 0

    var length: Double {
        zip(coords, coords.dropFirst()).reduce(0) { $0 + $1.0.distance(to: $1.1) }
    }
}

struct SavedRoute: Codable, Equatable, Identifiable {
    var id = UUID()
    var name: String
    var emoji: String
    var method: RouteMethod
    var points: [RoutePoint]
    var legs: [RouteLeg]
    var speedMode: SpeedMode
    var customKmh: Double

    var kmh: Double { speedMode.presetKmh ?? customKmh }
    var distance: Double { legs.reduce(0) { $0 + $1.length } }
    var duration: TimeInterval {
        distance / (kmh / 3.6) + legs.reduce(0) { $0 + $1.pauseAfter }
    }
}

@MainActor
final class FavoritesStore: ObservableObject {
    static let shared = FavoritesStore()

    @Published private(set) var places: [FavoriteLocation] = []
    @Published private(set) var routes: [SavedRoute] = []

    private let placesKey = "anyloc.favorites"
    private let routesKey = "anyloc.routes"

    private init() {
        places = load(placesKey) ?? []
        routes = load(routesKey) ?? []
    }

    func contains(lat: Double, lng: Double) -> Bool {
        places.contains { $0.lat == lat && $0.lng == lng }
    }

    func upsertPlace(_ place: FavoriteLocation) {
        if let i = places.firstIndex(where: { $0.id == place.id }) {
            places[i] = place
        } else {
            places.insert(place, at: 0)
        }
        save(places, placesKey)
    }

    func deletePlace(_ place: FavoriteLocation) {
        places.removeAll { $0.id == place.id }
        save(places, placesKey)
    }

    func upsertRoute(_ route: SavedRoute) {
        if let i = routes.firstIndex(where: { $0.id == route.id }) {
            routes[i] = route
        } else {
            routes.insert(route, at: 0)
        }
        save(routes, routesKey)
    }

    func deleteRoute(_ route: SavedRoute) {
        routes.removeAll { $0.id == route.id }
        save(routes, routesKey)
    }

    private func load<T: Decodable>(_ key: String) -> T? {
        guard let data = UserDefaults.standard.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    private func save<T: Encodable>(_ value: T, _ key: String) {
        if let data = try? JSONEncoder().encode(value) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }
}

enum Format {
    static func distance(_ meters: Double) -> String {
        meters < 1000 ? "\(Int(meters.rounded())) m" : String(format: "%.1f km", meters / 1000)
    }

    static func duration(_ seconds: TimeInterval) -> String {
        let minutes = Int((seconds / 60).rounded())
        if minutes < 60 { return "\(max(minutes, 1)) min" }
        return "\(minutes / 60) h \(String(format: "%02d", minutes % 60))"
    }

    static func coords(_ lat: Double, _ lng: Double) -> String {
        String(format: "%.5f, %.5f", lat, lng)
    }
}
