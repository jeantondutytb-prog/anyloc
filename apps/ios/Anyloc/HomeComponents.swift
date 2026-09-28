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

struct ApplyingOverlay: View {
    @State private var phase = 0

    var body: some View {
        ZStack {
            Color.black.opacity(0.5).ignoresSafeArea()
            VStack(spacing: 0) {
                Image("Logo")
                    .resizable()
                    .frame(width: 64, height: 64)
                    .shadow(color: Theme.accentStart.opacity(0.6), radius: 16)
                HStack(spacing: 6) {
                    ForEach(0..<3) { i in
                        Circle()
                            .fill(Theme.accentStart)
                            .frame(width: 6, height: 6)
                            .opacity(phase == i ? 1 : 0.35)
                    }
                }
                .padding(.top, 10)
                .padding(.bottom, 14)
                Text("Application de la position…")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(Theme.Dark.text)
                Text("Mise à jour de la position sur ton iPhone. Reste connecté, ça ne prend qu'un instant.")
                    .font(.system(size: 12.5))
                    .foregroundColor(Theme.Dark.muted)
                    .multilineTextAlignment(.center)
                    .padding(.top, 6)
            }
            .padding(.horizontal, 22)
            .padding(.top, 28)
            .padding(.bottom, 24)
            .frame(width: 260)
            .background(RoundedRectangle(cornerRadius: 22).fill(Theme.Dark.sheet))
            .overlay(RoundedRectangle(cornerRadius: 22).stroke(Theme.Dark.line, lineWidth: 1))
            .shadow(color: .black.opacity(0.55), radius: 30, y: 20)
        }
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 300_000_000)
                phase = (phase + 1) % 3
            }
        }
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
