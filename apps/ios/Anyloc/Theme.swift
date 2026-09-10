import SwiftUI

enum Theme {
    static let bg = Color(hex: 0x0A0A0F)
    static let bgSurface = Color(hex: 0x141419)
    static let bgSurfaceHover = Color(hex: 0x1C1C24)
    static let border = Color(hex: 0x27272F)
    static let accent = Color(hex: 0xEC4899)
    static let accentHover = Color(hex: 0xDB2777)
    static let accentBg = Color(hex: 0xEC4899).opacity(0.12)
    static let text = Color(hex: 0xF4F4F5)
    static let textMuted = Color(hex: 0xA1A1AA)
    static let textDim = Color(hex: 0x71717A)
    static let success = Color(hex: 0x34D399)
    static let error = Color(hex: 0xF87171)
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
