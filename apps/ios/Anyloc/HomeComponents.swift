import MapKit
import Network
import SwiftUI

// MARK: - Map markers

struct GradientPin: View {
    var body: some View {
        ZStack {
            Ellipse()
                .fill(RadialGradient(colors: [Theme.accentStart.opacity(0.5), .clear], center: .center, startRadius: 0, endRadius: 30))
                .frame(width: 64, height: 20)
                .offset(y: 27)
            ZStack {
                // Teardrop: a circle with one square corner, rotated so it points down.
                UnevenRoundedRectangle(topLeadingRadius: 19, bottomLeadingRadius: 0, bottomTrailingRadius: 19, topTrailingRadius: 19)
                    .fill(Theme.accentGradient)
                    .frame(width: 38, height: 38)
                    .rotationEffect(.degrees(-45))
                    .shadow(color: Theme.accentStart.opacity(0.55), radius: 12, y: 6)
                Circle().fill(.white).frame(width: 14, height: 14)
            }
        }
        .frame(width: 64, height: 46, alignment: .top)
    }
}

struct WaypointBadge: View {
    let label: String
    var isStop = false
    var size: CGFloat = 24

    var body: some View {
        Text(label)
            .font(.system(size: size * 0.46, weight: .bold))
            .foregroundColor(isStop ? Theme.Dark.accent : .white)
            .frame(width: size, height: size)
            .background {
                if isStop {
                    Circle().fill(Theme.Dark.well).overlay(Circle().stroke(Theme.accentStart, lineWidth: 2))
                } else {
                    Circle().fill(Theme.accentGradient)
                }
            }
    }
}

struct RunnerDot: View {
    @State private var pulse = false

    var body: some View {
        ZStack {
            Circle()
                .fill(Theme.accentStart.opacity(0.25))
                .frame(width: 44, height: 44)
                .scaleEffect(pulse ? 1 : 0.5)
                .opacity(pulse ? 0 : 1)
            Circle().fill(.white).frame(width: 20, height: 20)
            Circle().fill(Theme.accentGradient).frame(width: 14, height: 14)
        }
        .onAppear {
            withAnimation(.easeOut(duration: 1.4).repeatForever(autoreverses: false)) { pulse = true }
        }
    }
}

// MARK: - Controls

struct DarkSegmented<T: Hashable>: View {
    struct Item {
        let value: T
        let label: String
        var icon: String?
    }

    let items: [Item]
    @Binding var selection: T
    var compact = false

    var body: some View {
        HStack(spacing: 4) {
            ForEach(items, id: \.value) { item in
                let on = item.value == selection
                Button {
                    withAnimation(.easeInOut(duration: 0.18)) { selection = item.value }
                } label: {
                    HStack(spacing: items.count > 2 ? 6 : 8) {
                        if let icon = item.icon { Image(systemName: icon) }
                        Text(item.label).lineLimit(1).minimumScaleFactor(0.8)
                    }
                    .font(.system(size: compact ? 13 : 16, weight: .medium))
                    .foregroundColor(on ? Theme.Dark.accent : Theme.Dark.textSoft)
                    .frame(maxWidth: .infinity)
                    .frame(height: compact ? 32 : 42)
                    .background(
                        RoundedRectangle(cornerRadius: compact ? 9 : 11)
                            .fill(on ? Theme.Dark.accentBg : .clear)
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(4)
        .background(RoundedRectangle(cornerRadius: 15).fill(Theme.Dark.well))
        .overlay(RoundedRectangle(cornerRadius: 15).stroke(Theme.Dark.line, lineWidth: 1))
    }
}

struct SquareIconButton: View {
    let icon: String
    var size: CGFloat = 50
    var isOn = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 19, weight: .semibold))
                .foregroundColor(Theme.Dark.accent)
                .frame(width: size, height: size)
                .background(RoundedRectangle(cornerRadius: 14).fill(isOn ? Theme.Dark.accentBg.opacity(2) : Theme.Dark.accentBg))
        }
        .buttonStyle(.plain)
    }
}

struct GradientCTA: View {
    let title: String
    let icon: String
    var isLoading = false
    var isDisabled = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                if isLoading {
                    ProgressView().tint(.white)
                } else {
                    Image(systemName: icon).font(.system(size: 19, weight: .semibold))
                }
                Text(title).font(.system(size: 17, weight: .semibold))
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(RoundedRectangle(cornerRadius: 16).fill(Theme.accentGradient))
            .shadow(color: Theme.accentStart.opacity(isDisabled ? 0 : 0.45), radius: 14, y: 8)
            .opacity(isDisabled ? 0.45 : 1)
        }
        .buttonStyle(.plain)
        .disabled(isDisabled || isLoading)
    }
}

struct Caption: View {
    let text: String
    var color: Color = Theme.Dark.accent

    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 12, weight: .semibold))
            .tracking(0.9)
            .foregroundColor(color)
    }
}

struct Chip: View {
    let title: String
    let subtitle: String
    let isOn: Bool

    var body: some View {
        VStack(spacing: 2) {
            Text(title).font(.system(size: 13, weight: .medium))
            Text(subtitle).font(.system(size: 11)).opacity(isOn ? 0.75 : 1)
                .foregroundColor(isOn ? Theme.Dark.accent : Theme.Dark.dim)
        }
        .foregroundColor(isOn ? Theme.Dark.accent : Theme.Dark.textSoft)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
        .background(RoundedRectangle(cornerRadius: 12).fill(isOn ? Theme.Dark.accentBg : Theme.Dark.panel))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(isOn ? Theme.Dark.accentLine : Theme.Dark.line, lineWidth: 1))
    }
}

extension View {
    func floatingCard(radius: CGFloat = 18) -> some View {
        background(RoundedRectangle(cornerRadius: radius).fill(Theme.Dark.float))
            .overlay(RoundedRectangle(cornerRadius: radius).stroke(Theme.Dark.line, lineWidth: 1))
    }
}

// MARK: - Applying overlay

/// Path of the teleport animation, sampled along the great circle so long
/// trips arc on the map like a flight.
struct TeleportFlight: Equatable {
    let path: [CLLocationCoordinate2D]
    var progress: Double = 0

    init(origin: Coord, dest: Coord, samples: Int = 120) {
        path = (0...samples).map { Self.greatCircle(origin, dest, Double($0) / Double(samples)) }
    }

    var current: CLLocationCoordinate2D {
        let x = progress * Double(path.count - 1)
        let i = min(Int(x), path.count - 2), f = x - Double(i)
        let a = path[i], b = path[i + 1]
        return CLLocationCoordinate2D(latitude: a.latitude + (b.latitude - a.latitude) * f,
                                      longitude: a.longitude + (b.longitude - a.longitude) * f)
    }

    var trail: [CLLocationCoordinate2D] {
        Array(path.prefix(Int(progress * Double(path.count - 1)) + 1)) + [current]
    }

    static func == (l: Self, r: Self) -> Bool {
        l.progress == r.progress && l.path.count == r.path.count
            && l.path.first?.latitude == r.path.first?.latitude && l.path.last?.latitude == r.path.last?.latitude
    }

    static func greatCircle(_ a: Coord, _ b: Coord, _ t: Double) -> CLLocationCoordinate2D {
        func vec(_ c: Coord) -> (Double, Double, Double) {
            let la = c.lat * .pi / 180, lo = c.lng * .pi / 180
            return (cos(la) * cos(lo), cos(la) * sin(lo), sin(la))
        }
        let p = vec(a), q = vec(b)
        let d = acos(max(-1, min(1, p.0 * q.0 + p.1 * q.1 + p.2 * q.2)))
        guard d > 1e-9 else { return a.cl }
        let s1 = sin((1 - t) * d) / sin(d), s2 = sin(t * d) / sin(d)
        let x = s1 * p.0 + s2 * q.0, y = s1 * p.1 + s2 * q.1, z = s1 * p.2 + s2 * q.2
        return CLLocationCoordinate2D(latitude: atan2(z, sqrt(x * x + y * y)) * 180 / .pi,
                                      longitude: atan2(y, x) * 180 / .pi)
    }
}

/// Pill under the search bar narrating the teleport: "on the way", then "arrived".
struct TeleportBanner: View {
    enum State: Equatable {
        case flying(String)
        case arrived(String)
    }

    let banner: State

    var body: some View {
        HStack(spacing: 10) {
            switch banner {
            case .flying(let name):
                ProgressView().tint(Theme.Dark.accent).controlSize(.small)
                Text("Téléportation vers \(name)…")
            case .arrived(let name):
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 18))
                    .foregroundStyle(Theme.accentGradient)
                Text("Téléporté à \(name)")
            }
        }
        .font(.system(size: 15, weight: .semibold))
        .foregroundColor(Theme.Dark.text)
        .lineLimit(1)
        .padding(.horizontal, 16)
        .frame(height: 44)
        .background(Capsule().fill(Theme.Dark.float))
        .overlay(Capsule().stroke(Theme.Dark.accentLine, lineWidth: 1))
        .shadow(color: Theme.accentStart.opacity(0.35), radius: 14, y: 6)
    }
}

/// "Mode tournage": when on, each teleport opens with a full-screen branded card so
/// the anyloc.io name is big and readable in screen recordings for marketing videos.
enum FilmingMode {
    static let key = "anyloc.filmingMode"
    static var isOn: Bool { UserDefaults.standard.bool(forKey: key) }
}

struct TeleportShowcase: Equatable {
    enum Step: Equatable { case connecting, sending, done }
    let destination: String
    var step: Step = .connecting
}

/// Full-screen branded loading shown during a teleport in filming mode.
struct TeleportShowcaseView: View {
    let showcase: TeleportShowcase
    @SwiftUI.State private var pulse = false
    /// Staged entrance: logo, then the wordmark, then the status line.
    @SwiftUI.State private var stage = 0

    var body: some View {
        ZStack {
            // Opaque instead of a blur: fading a material over the live map stutters.
            Theme.Dark.bg.opacity(0.95)
            RadialGradient(colors: [Theme.accentStart.opacity(0.35), .clear],
                           center: .center, startRadius: 10, endRadius: 320)

            VStack(spacing: 28) {
                ZStack {
                    ForEach(0..<3) { i in
                        Circle()
                            .stroke(Theme.accentGradient, lineWidth: 2)
                            .frame(width: 150, height: 150)
                            .scaleEffect(pulse ? 2.1 : 0.8)
                            .opacity(pulse ? 0 : 0.7)
                            .animation(.easeOut(duration: 1.8).repeatForever(autoreverses: false)
                                .delay(Double(i) * 0.6), value: pulse)
                    }
                    Image("Logo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 140, height: 140)
                        .scaleEffect(pulse ? 1.06 : 0.96)
                        .animation(.easeInOut(duration: 0.9).repeatForever(), value: pulse)
                        .shadow(color: Theme.accentStart.opacity(0.6), radius: 24)
                }
                .frame(height: 220)
                .scaleEffect(stage >= 1 ? 1 : 0.5)
                .opacity(stage >= 1 ? 1 : 0)

                (Text("anyloc").foregroundColor(.white)
                    + Text(".io").foregroundStyle(Theme.accentGradient))
                    .font(.system(size: 60, weight: .heavy, design: .rounded))
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
                    .offset(y: stage >= 2 ? 0 : 24)
                    .opacity(stage >= 2 ? 1 : 0)

                HStack(spacing: 10) {
                    if showcase.step == .done {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(Theme.accentGradient)
                    } else {
                        ProgressView().tint(Theme.Dark.accent)
                    }
                    Text(stepText)
                        .contentTransition(.opacity)
                }
                .font(.system(size: 19, weight: .semibold))
                .foregroundColor(Theme.Dark.textSoft)
                .lineLimit(1)
                .padding(.horizontal, 20)
                .frame(height: 50)
                .background(Capsule().fill(Theme.Dark.panel))
                .overlay(Capsule().stroke(Theme.Dark.accentLine, lineWidth: 1))
                .animation(.easeInOut(duration: 0.25), value: showcase.step)
                .offset(y: stage >= 3 ? 0 : 16)
                .opacity(stage >= 3 ? 1 : 0)
            }
            .padding(.horizontal, 24)
        }
        .ignoresSafeArea()
        .onAppear {
            pulse = true
            withAnimation(.spring(response: 0.7, dampingFraction: 0.7).delay(0.25)) { stage = 1 }
            withAnimation(.easeOut(duration: 0.6).delay(0.75)) { stage = 2 }
            withAnimation(.easeOut(duration: 0.5).delay(1.2)) { stage = 3 }
        }
    }

    private var stepText: String {
        switch showcase.step {
        case .connecting: return "Connexion à l'iPhone…"
        case .sending: return "Téléportation vers \(showcase.destination)…"
        case .done: return "Tu es à \(showcase.destination)"
        }
    }
}

/// The destination pin, dropping in with a bounce when it appears.
struct DroppingPin: View {
    @SwiftUI.State private var landed = false

    var body: some View {
        GradientPin()
            .offset(y: landed ? 0 : -36)
            .opacity(landed ? 1 : 0)
            .onAppear { withAnimation(.spring(response: 0.45, dampingFraction: 0.55)) { landed = true } }
    }
}

// MARK: - Name + emoji editor

struct NameEmojiDraft: Identifiable {
    let id = UUID()
    let title: String
    var name: String
    var emoji: String
    let onSave: (String, String) -> Void
}

struct NameEmojiSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State var draft: NameEmojiDraft
    @FocusState private var focused: Bool

    private let emojis = ["📍", "🏠", "💼", "🎮", "✈️", "☕", "🏖️", "🚗", "⭐", "❤️", "🏋️", "🎓", "🍔", "🌆", "🏔️", "🎉"]

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text(draft.title)
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(Theme.Dark.text)

            HStack(spacing: 12) {
                Text(draft.emoji)
                    .font(.system(size: 24))
                    .frame(width: 50, height: 50)
                    .background(RoundedRectangle(cornerRadius: 14).fill(Theme.Dark.panelHigh))
                TextField("", text: $draft.name, prompt: Text("Nom").foregroundColor(Theme.Dark.dim))
                    .focused($focused)
                    .font(.system(size: 17))
                    .foregroundColor(Theme.Dark.text)
                    .padding(.horizontal, 14)
                    .frame(height: 50)
                    .background(RoundedRectangle(cornerRadius: 14).fill(Theme.Dark.panel))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.Dark.line, lineWidth: 1))
            }

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 8), spacing: 8) {
                ForEach(emojis, id: \.self) { e in
                    Button { draft.emoji = e } label: {
                        Text(e)
                            .font(.system(size: 22))
                            .frame(maxWidth: .infinity)
                            .frame(height: 40)
                            .background(RoundedRectangle(cornerRadius: 10).fill(draft.emoji == e ? Theme.Dark.accentBg : Theme.Dark.panel))
                            .overlay(RoundedRectangle(cornerRadius: 10).stroke(draft.emoji == e ? Theme.Dark.accentLine : .clear, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }

            GradientCTA(title: "Enregistrer", icon: "checkmark",
                        isDisabled: draft.name.trimmingCharacters(in: .whitespaces).isEmpty) {
                draft.onSave(draft.name.trimmingCharacters(in: .whitespaces), draft.emoji)
                dismiss()
            }
        }
        .padding(20)
        .frame(maxHeight: .infinity, alignment: .top)
        .background(Theme.Dark.bg.ignoresSafeArea())
        .presentationDetents([.height(360)])
        .presentationBackground(Theme.Dark.bg)
        .preferredColorScheme(.dark)
        .onAppear { focused = true }
    }
}

// MARK: - Network

@MainActor
final class NetworkMonitor: ObservableObject {
    @Published private(set) var label = "Prêt"

    private let monitor = NWPathMonitor()

    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            let label: String
            if path.status != .satisfied {
                label = "Hors ligne"
            } else if path.usesInterfaceType(.wifi) {
                label = "Prêt sur Wi-Fi"
            } else if path.usesInterfaceType(.cellular) {
                label = "Prêt sur données mobiles"
            } else {
                label = "Prêt"
            }
            Task { @MainActor in self?.label = label }
        }
        monitor.start(queue: DispatchQueue(label: "io.anyloc.network"))
    }

    deinit { monitor.cancel() }

    var isOffline: Bool { label == "Hors ligne" }
}

/// Replaces the "set location" button while the fake position is live:
/// elapsed time since it was applied, plus a stop button.
struct ActiveLocationBar: View {
    let since: Date
    let onStop: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            HStack(spacing: 12) {
                Image(systemName: "location.fill")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(Theme.Dark.accent)
                    .frame(width: 40, height: 40)
                    .background(RoundedRectangle(cornerRadius: 12).fill(Theme.Dark.accentBg))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Position simulée")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(Theme.Dark.muted)
                    TimelineView(.periodic(from: since, by: 1)) { ctx in
                        Text(Self.elapsed(from: since, to: ctx.date))
                            .font(.system(size: 20, weight: .semibold, design: .monospaced))
                            .foregroundColor(Theme.Dark.accent)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 10)
            .frame(height: 64)
            .background(RoundedRectangle(cornerRadius: 16).fill(Theme.Dark.panel))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.Dark.line, lineWidth: 1))

            Button(action: onStop) {
                VStack(spacing: 4) {
                    Image(systemName: "stop.fill").font(.system(size: 16, weight: .semibold))
                    Text("Stop").font(.system(size: 13, weight: .semibold))
                }
                .foregroundColor(Theme.error)
                .frame(width: 78, height: 64)
                .background(RoundedRectangle(cornerRadius: 16).fill(Theme.error.opacity(0.12)))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.error.opacity(0.4), lineWidth: 1))
            }
            .buttonStyle(.plain)
        }
    }

    private static func elapsed(from start: Date, to now: Date) -> String {
        let s = max(0, Int(now.timeIntervalSince(start)))
        let (h, m, sec) = (s / 3600, s / 60 % 60, s % 60)
        return h > 0 ? String(format: "%d:%02d:%02d", h, m, sec) : String(format: "%02d:%02d", m, sec)
    }
}
