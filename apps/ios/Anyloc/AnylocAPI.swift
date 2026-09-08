import Foundation

struct RemoteLocation: Codable {
    let name: String
    let lat: Double
    let lng: Double
    let accuracy: Double
    let isActive: Bool
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

    func fetchLocation() async throws -> RemoteLocation {
        let trimmed = baseURL.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: "\(trimmed)/api/device/location") else {
            throw AnylocAPIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw AnylocAPIError.server(-1)
        }

        if http.statusCode == 401 || http.statusCode == 403 {
            throw AnylocAPIError.unauthorized
        }

        guard http.statusCode == 200 else {
            throw AnylocAPIError.server(http.statusCode)
        }

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
