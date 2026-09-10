import Foundation

struct LocationData: Codable, Equatable {
    let name: String
    let lat: Double
    let lng: Double
    let isActive: Bool
}

struct NominatimResult: Identifiable {
    let id: String
    let name: String
    let lat: Double
    let lng: Double
}

@MainActor
final class LocationAPI {
    private let supabaseURL = "https://gqkxnktprctdvpwvnqli.supabase.co"
    private let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxa3hua3RwcmN0ZHZwd3ZucWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3ODUxMTgsImV4cCI6MjEwNDM2MTExOH0.7kOHGgU1s1EDr0luSvDxvcGj3pyOt-8_79dX4sg8kXA"

    func upsertLocation(name: String, lat: Double, lng: Double, isActive: Bool) async throws {
        await AuthService.shared.verifySession()
        guard let session = AuthService.shared.session else {
            throw LocationError.serverError("Pas de session active")
        }

        let url = URL(string: "\(supabaseURL)/rest/v1/location_settings?on_conflict=user_id")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("resolution=merge-duplicates,return=representation", forHTTPHeaderField: "Prefer")

        let body: [String: Any] = [
            "user_id": session.user.id,
            "name": name,
            "lat": lat,
            "lng": lng,
            "is_active": isActive,
            "accuracy": 10,
            "updated_at": ISO8601DateFormatter().string(from: Date()),
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        print("[Anyloc] Upsert user_id=\(session.user.id) lat=\(lat) lng=\(lng) name=\(name)")

        let (data, response) = try await URLSession.shared.data(for: request)
        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        let responseBody = String(data: data, encoding: .utf8) ?? ""
        print("[Anyloc] Response \(code): \(responseBody)")

        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw LocationError.serverError("HTTP \(code): \(responseBody)")
        }
    }

    func fetchLocation() async throws -> LocationData? {
        guard let session = AuthService.shared.session else { return nil }

        let url = URL(string: "\(supabaseURL)/rest/v1/location_settings?user_id=eq.\(session.user.id)&select=name,lat,lng,is_active")!
        var request = URLRequest(url: url)
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { return nil }

        let rows = try JSONDecoder().decode([[String: AnyCodable]].self, from: data)
        guard let row = rows.first else { return nil }

        return LocationData(
            name: row["name"]?.stringValue ?? "",
            lat: row["lat"]?.doubleValue ?? 0,
            lng: row["lng"]?.doubleValue ?? 0,
            isActive: row["is_active"]?.boolValue ?? false
        )
    }

    func searchPlaces(query: String) async throws -> [NominatimResult] {
        guard query.count >= 2 else { return [] }
        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        let url = URL(string: "https://nominatim.openstreetmap.org/search?q=\(encoded)&format=json&limit=6&addressdetails=0")!
        var request = URLRequest(url: url)
        request.setValue("fr", forHTTPHeaderField: "Accept-Language")
        request.setValue("Anyloc/1.0", forHTTPHeaderField: "User-Agent")

        let (data, _) = try await URLSession.shared.data(for: request)
        let items = try JSONDecoder().decode([NominatimItem].self, from: data)
        return items.map {
            let name = $0.display_name.split(separator: ",").prefix(3).joined(separator: ",").trimmingCharacters(in: .whitespaces)
            return NominatimResult(id: "\($0.lat),\($0.lon)", name: name, lat: Double($0.lat) ?? 0, lng: Double($0.lon) ?? 0)
        }
    }
}

enum LocationError: LocalizedError {
    case saveFailed
    case serverError(String)
    var errorDescription: String? {
        switch self {
        case .saveFailed: return "Impossible d'enregistrer la position."
        case .serverError(let msg): return msg
        }
    }
}

private struct NominatimItem: Decodable {
    let display_name: String
    let lat: String
    let lon: String
}

// Simple wrapper for heterogeneous JSON decoding
struct AnyCodable: Decodable {
    let value: Any

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let v = try? container.decode(Bool.self) { value = v }
        else if let v = try? container.decode(Double.self) { value = v }
        else if let v = try? container.decode(String.self) { value = v }
        else { value = "" }
    }

    var stringValue: String? { value as? String }
    var doubleValue: Double? { value as? Double }
    var boolValue: Bool? { value as? Bool }
}
