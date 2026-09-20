import Foundation

@MainActor
final class SubscriptionService: ObservableObject {
    static let shared = SubscriptionService()

    @Published private(set) var hasAccess = true
    @Published private(set) var inactiveDetails: SubscriptionInactiveDetails?
    @Published private(set) var isLoading = false
    @Published private(set) var hasCheckedOnce = false

    private let apiBaseURL = URL(string: "https://www.anyloc.io")!

    private init() {}

    func reset() {
        hasAccess = true
        inactiveDetails = nil
        isLoading = false
        hasCheckedOnce = false
    }

    func refresh() async {
        guard let session = AuthService.shared.session else {
            reset()
            return
        }

        isLoading = true
        defer { isLoading = false }

        var request = URLRequest(
            url: apiBaseURL.appendingPathComponent("/api/subscription/access")
        )
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                return
            }

            let decoded = try JSONDecoder().decode(SubscriptionAccessResponse.self, from: data)
            hasAccess = decoded.hasAccess
            inactiveDetails = decoded.hasAccess ? nil : (decoded.inactive ?? .fallback)
            hasCheckedOnce = true
        } catch {
            hasCheckedOnce = true
            print("[Anyloc] Subscription refresh failed:", error.localizedDescription)
        }
    }
}
