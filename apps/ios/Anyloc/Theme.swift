import SwiftUI

enum Theme {
    static let bg = Color(hex: 0xFFF9FB)
    static let bgSurface = Color(hex: 0xFFFFFF)
    static let bgSurfaceHover = Color(hex: 0xFDF2F8)
    static let border = Color(hex: 0xE4E4E7)
    static let accentStart = Color(hex: 0xEC4899)
    static let accentEnd = Color(hex: 0xA855F7)
    static let accentSolid = Color(hex: 0xEC4899)
    static let accentBg = Color(hex: 0xEC4899, alpha: 0.12)
    static let text = Color(hex: 0x18181B)
    static let textMuted = Color(hex: 0x71717A)
    static let textDim = Color(hex: 0xA1A1AA)
    static let success = Color(hex: 0x34D399)
    static let error = Color(hex: 0xF87171)

    static let accentGradient = LinearGradient(
        colors: [accentStart, accentEnd],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

extension Color {
    init(hex: UInt, alpha: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: alpha
        )
    }
}

/// Primary CTA style used across Login, Dashboard, Renewal, Settings and
/// SubscriptionExpired — matches the web checkout's `.btn-gradient`.
struct PrimaryGradientButtonStyle: ButtonStyle {
    var isDisabled: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .foregroundColor(.white)
            .background(Theme.accentGradient)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .opacity(isDisabled ? 0.45 : (configuration.isPressed ? 0.85 : 1))
    }
}

/// Shared card surface: white background, hairline border, rounded corners.
struct CardBackground: ViewModifier {
    var cornerRadius: CGFloat = 14

    func body(content: Content) -> some View {
        content
            .background(Theme.bgSurface)
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(Theme.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
    }
}

extension View {
    func cardBackground(cornerRadius: CGFloat = 14) -> some View {
        modifier(CardBackground(cornerRadius: cornerRadius))
    }
}
