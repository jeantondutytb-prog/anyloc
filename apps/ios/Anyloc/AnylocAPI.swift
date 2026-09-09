import Foundation

struct RemoteLocation: Codable {
    let name: String
    let lat: Double
    let lng: Double
    let accuracy: Double
    let isActive: Bool
}

struct GeocodeResult: Codable, Identifiable {
    let id: String
    let name: String
    let lat: Double
    let lng: Double
    let subtitle: String
}

struct DeviceLocationResponse: Codable {
    struct LocationPayload: Codable {
        let name: String
        let lat: Double
        let lng: Double
        let accuracy: Double
        let isActive: Bool
    }

    let location: LocationPayload
}

struct GeocodeResponse: Codable {
    let results: [GeocodeResult]
}

enum AnylocAPIError: LocalizedError {
    case invalidURL
    case unauthorized
    case server(Int)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "URL API invalide"
        case .unauthorized:
            return "Token invalide ou abonnement inactif"
        case .server(let code):
            return "Erreur serveur (\(code))"
        }
    }
}

struct AnylocAPI {
    let baseURL: String
    let token: String

    private var trimmedBaseURL: String {
        baseURL.trimmingCharacters(in: .whitespacesAndNewlines).trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }

    func fetchLocation() async throws -> RemoteLocation {
        let data = try await sendRequest(path: "/api/device/location", method: "GET")
        return try decodeLocation(from: data)
    }

    func updateLocation(name: String, lat: Double, lng: Double, isActive: Bool = true) async throws -> RemoteLocation {
        let payload: [String: Any] = [
            "name": name,
            "lat": lat,
            "lng": lng,
            "isActive": isActive,
            "mode": "static",
        ]

        let body = try JSONSerialization.data(withJSONObject: payload)
        let data = try await sendRequest(path: "/api/device/location", method: "PUT", body: body)
        return try decodeLocation(from: data)
    }

    func searchPlaces(query: String) async throws -> [GeocodeResult] {
        guard query.count >= 2 else {
            return []
        }

        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        let data = try await sendRequest(
            path: "/api/geocode?q=\(encoded)",
            method: "GET",
            authenticated: false
        )

        let decoded = try JSONDecoder().decode(GeocodeResponse.self, from: data)
        return decoded.results
    }

    private func sendRequest(path: String, method: String, body: Data? = nil, authenticated: Bool = true) async throws -> Data {
        guard let url = URL(string: "\(trimmedBaseURL)\(path)") else {
            throw AnylocAPIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method

        if authenticated {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw AnylocAPIError.server(-1)
        }

        if http.statusCode == 401 || http.statusCode == 403 {
            throw AnylocAPIError.unauthorized
        }

        guard (200...299).contains(http.statusCode) else {
            throw AnylocAPIError.server(http.statusCode)
        }

        return data
    }

    private func decodeLocation(from data: Data) throws -> RemoteLocation {
        let decoded = try JSONDecoder().decode(DeviceLocationResponse.self, from: data)

        return RemoteLocation(
            name: decoded.location.name,
            lat: decoded.location.lat,
            lng: decoded.location.lng,
            accuracy: decoded.location.accuracy,
            isActive: decoded.location.isActive
        )
    }
}
