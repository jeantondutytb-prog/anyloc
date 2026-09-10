import AuthenticationServices
import Foundation
import UIKit

struct SupabaseSession: Codable {
    let accessToken: String
    let refreshToken: String
    let user: SupabaseUser
}

struct SupabaseUser: Codable {
    let id: String
    let email: String?
}

@MainActor
final class AuthService: ObservableObject {
    static let shared = AuthService()

    @Published var session: SupabaseSession?
    @Published var isLoading = false

    private let supabaseURL = "https://gqkxnktprctdvpwvnqli.supabase.co"
    private let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxa3hua3RwcmN0ZHZwd3ZucWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3ODUxMTgsImV4cCI6MjEwNDM2MTExOH0.7kOHGgU1s1EDr0luSvDxvcGj3pyOt-8_79dX4sg8kXA"
    private let callbackScheme = "anyloc"

    var isLoggedIn: Bool { session != nil }

    private init() {
        restoreSession()
    }

    // MARK: - Email/Password

    func login(email: String, password: String) async throws {
        let url = URL(string: "\(supabaseURL)/auth/v1/token?grant_type=password")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["email": email, "password": password])

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            let body = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            let msg = body?["error_description"] as? String ?? "Email ou mot de passe incorrect."
            throw AuthError.loginFailed(msg)
        }

        let decoded = try JSONDecoder().decode(TokenResponse.self, from: data)
        let user = SupabaseUser(id: decoded.user.id, email: decoded.user.email)
        session = SupabaseSession(accessToken: decoded.access_token, refreshToken: decoded.refresh_token, user: user)
        saveSession()
    }

    func signup(email: String, password: String) async throws {
        let url = URL(string: "\(supabaseURL)/auth/v1/signup")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["email": email, "password": password])

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            let body = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            let msg = body?["error_description"] as? String ?? "Erreur lors de la création du compte."
            throw AuthError.loginFailed(msg)
        }

        let decoded = try JSONDecoder().decode(TokenResponse.self, from: data)
        if !decoded.access_token.isEmpty {
            let user = SupabaseUser(id: decoded.user.id, email: decoded.user.email)
            session = SupabaseSession(accessToken: decoded.access_token, refreshToken: decoded.refresh_token, user: user)
            saveSession()
        } else {
            throw AuthError.loginFailed("Vérifie ton email pour confirmer ton compte.")
        }
    }

    // MARK: - Google OAuth

    func loginWithGoogle() async throws {
        let redirectURI = "\(callbackScheme)://auth/callback"
        let authURL = URL(string: "\(supabaseURL)/auth/v1/authorize?provider=google&redirect_to=\(redirectURI.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)")!

        let callbackURL = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<URL, Error>) in
            let session = ASWebAuthenticationSession(url: authURL, callbackURLScheme: callbackScheme) { url, error in
                if let error {
                    continuation.resume(throwing: error)
                } else if let url {
                    continuation.resume(returning: url)
                } else {
                    continuation.resume(throwing: AuthError.cancelled)
                }
            }
            session.prefersEphemeralWebBrowserSession = false
            session.presentationContextProvider = ASWebAuthContextProvider.shared
            session.start()
        }

        guard let fragment = callbackURL.fragment else {
            throw AuthError.loginFailed("Pas de tokens dans la réponse.")
        }

        let params = URLComponents(string: "?\(fragment)")?.queryItems?.reduce(into: [String: String]()) {
            $0[$1.name] = $1.value
        } ?? [:]

        guard let accessToken = params["access_token"], !accessToken.isEmpty else {
            throw AuthError.loginFailed("Token manquant dans la réponse.")
        }

        let refreshToken = params["refresh_token"] ?? ""
        let user = try await fetchUser(accessToken: accessToken)
        session = SupabaseSession(accessToken: accessToken, refreshToken: refreshToken, user: user)
        saveSession()
    }

    // MARK: - Session

    func logout() {
        session = nil
        UserDefaults.standard.removeObject(forKey: "anyloc.session")
    }

    func verifySession() async {
        guard let s = session else { return }
        do {
            let user = try await fetchUser(accessToken: s.accessToken)
            session = SupabaseSession(accessToken: s.accessToken, refreshToken: s.refreshToken, user: user)
        } catch {
            // Try refresh
            if let refreshed = try? await refreshToken(s.refreshToken) {
                session = refreshed
                saveSession()
            } else {
                logout()
            }
        }
    }

    private func fetchUser(accessToken: String) async throws -> SupabaseUser {
        let url = URL(string: "\(supabaseURL)/auth/v1/user")!
        var request = URLRequest(url: url)
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw AuthError.loginFailed("Session expirée.")
        }

        let decoded = try JSONDecoder().decode(UserResponse.self, from: data)
        return SupabaseUser(id: decoded.id, email: decoded.email)
    }

    private func refreshToken(_ token: String) async throws -> SupabaseSession {
        let url = URL(string: "\(supabaseURL)/auth/v1/token?grant_type=refresh_token")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["refresh_token": token])

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw AuthError.loginFailed("Refresh échoué.")
        }

        let decoded = try JSONDecoder().decode(TokenResponse.self, from: data)
        let user = SupabaseUser(id: decoded.user.id, email: decoded.user.email)
        return SupabaseSession(accessToken: decoded.access_token, refreshToken: decoded.refresh_token, user: user)
    }

    private func saveSession() {
        guard let session else { return }
        if let data = try? JSONEncoder().encode(session) {
            UserDefaults.standard.set(data, forKey: "anyloc.session")
        }
    }

    private func restoreSession() {
        guard let data = UserDefaults.standard.data(forKey: "anyloc.session"),
              let saved = try? JSONDecoder().decode(SupabaseSession.self, from: data) else { return }
        session = saved
    }
}

// MARK: - Supporting types

enum AuthError: LocalizedError {
    case loginFailed(String)
    case cancelled

    var errorDescription: String? {
        switch self {
        case .loginFailed(let msg): return msg
        case .cancelled: return "Connexion annulée."
        }
    }
}

private struct TokenResponse: Decodable {
    let access_token: String
    let refresh_token: String
    let user: UserResponse
}

private struct UserResponse: Decodable {
    let id: String
    let email: String?
}

final class ASWebAuthContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = ASWebAuthContextProvider()
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first(where: \.isKeyWindow) ?? ASPresentationAnchor()
    }
}
