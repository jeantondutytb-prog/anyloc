import Foundation

@MainActor
final class SubscriptionService: ObservableObject {
    static let shared = SubscriptionService()

    @Published private(set) var hasAccess = true
    @Published private(set) var inactiveDetails: SubscriptionInactiveDetails?
    @Published private(set) var planId: String?
    @Published private(set) var isTrial = false
    @Published private(set) var isLoading = false
    @Published private(set) var hasCheckedOnce = false

    private let apiBaseURL = URL(string: "https://www.anyloc.io")!

    private init() {}

    func reset() {
        hasAccess = true
        inactiveDetails = nil
        planId = nil
        isTrial = false
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
                let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                if status != 401 {
                    AppErrorReporter.report("subscription/refresh", message: "HTTP \(status)", context: ["http_status": status])
                }
                return
            }

            let decoded = try JSONDecoder().decode(SubscriptionAccessResponse.self, from: data)
            hasAccess = decoded.hasAccess
            inactiveDetails = decoded.hasAccess ? nil : (decoded.inactive ?? .fallback)
            planId = decoded.hasAccess ? decoded.planId : nil
            isTrial = decoded.hasAccess && decoded.isTrial
            hasCheckedOnce = true
        } catch {
            hasCheckedOnce = true
            AppErrorReporter.report("subscription/refresh", error)
        }
    }
}
