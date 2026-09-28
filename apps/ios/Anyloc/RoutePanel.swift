import SwiftUI
import UniformTypeIdentifiers

/// Bottom-sheet content for the "Trajet" mode: builder, or live progress while a route runs.
struct RoutePanel: View {
    @ObservedObject var builder: RouteBuilder
    @ObservedObject var runner: RouteRunner
    let onAddStop: () -> Void
    let onStart: () -> Void
    let onSave: () -> Void

    @State private var showImporter = false
    @State private var importError: String?

    var body: some View {
        if runner.isRunning {
            running
        } else {
            editor
        }
    }

    // MARK: Running

    private var running: some View {
        VStack(alignment: .leading, spacing: 12) {
            Caption(text: "Trajet en cours")
            Text(runner.name)
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(Theme.Dark.text)
                .lineLimit(1)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.Dark.panel)
                    Capsule().fill(Theme.accentGradient)
                        .frame(width: max(8, geo.size.width * runner.progress))
                }
            }
            .frame(height: 8)
            HStack {
                Text("\(Int(runner.progress * 100)) %")
                    .foregroundColor(Theme.Dark.text)
                Spacer()
                Text("Reste \(Format.duration(runner.remaining))")
                    .foregroundColor(Theme.Dark.muted)
            }
            .font(.system(size: 13.5, weight: .medium))
            if let error = runner.lastError {
                Text(error)
                    .font(.system(size: 12))
                    .foregroundColor(Theme.error)
                    .lineLimit(2)
            }
            Label("Garde Anyloc ouvert pendant le trajet.", systemImage: "info.circle")
                .font(.system(size: 12.5))
                .foregroundColor(Theme.Dark.muted)
            Button {
                runner.stop()
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "stop.fill")
                    Text("Arrêter le trajet")
                }
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(Theme.Dark.text)
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .background(RoundedRectangle(cornerRadius: 16).fill(Theme.Dark.panelHigh))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Theme.Dark.lineStrong, lineWidth: 1))
            }
            .buttonStyle(.plain)
        }
        .padding(.top, 14)
    }

    // MARK: Editor

    private var editor: some View {
        VStack(alignment: .leading, spacing: 0) {
            methods
            methodContent
                .padding(.top, 10)
            speeds
                .padding(.top, 10)
            HStack {
                Text("Distance ").foregroundColor(Theme.Dark.muted) + Text(Format.distance(builder.distance)).foregroundColor(Theme.Dark.text).bold()
                Spacer()
                Text("Durée ").foregroundColor(Theme.Dark.muted) + Text(builder.distance > 0 ? Format.duration(builder.duration) : "—").foregroundColor(Theme.Dark.text).bold()
            }
            .font(.system(size: 13.5))
            .padding(.vertical, 10)
            .padding(.horizontal, 2)
            HStack(spacing: 10) {
                SquareIconButton(icon: builder.savedRouteID == nil ? "bookmark" : "bookmark.fill", size: 56, action: onSave)
                    .disabled(!builder.canStart)
                    .opacity(builder.canStart ? 1 : 0.45)
                GradientCTA(title: "Lancer le trajet", icon: "play.fill",
                            isLoading: builder.isComputing, isDisabled: !builder.canStart, action: onStart)
            }
        }
        .padding(.top, 12)
        .fileImporter(isPresented: $showImporter, allowedContentTypes: gpxTypes) { result in
            do {
                try builder.importGPX(from: result.get())
            } catch {
                importError = error.localizedDescription
            }
        }
        .alert("Import impossible", isPresented: Binding(get: { importError != nil }, set: { if !$0 { importError = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(importError ?? "")
        }
    }

    private var gpxTypes: [UTType] {
        [UTType(filenameExtension: "gpx"), .xml].compactMap { $0 }
    }

    private var methods: some View {
        HStack(spacing: 8) {
            ForEach(RouteMethod.allCases, id: \.self) { m in
                let on = builder.method == m
                Button {
                    builder.method = m
                    if m == .gpx && builder.gpxFileName == nil { showImporter = true }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: m.icon).font(.system(size: 13, weight: .semibold))
                        Text(m.label).font(.system(size: 13, weight: .medium))
                    }
                    .foregroundColor(on ? Theme.Dark.accent : Theme.Dark.textSoft)
                    .frame(maxWidth: .infinity)
                    .frame(height: 36)
                    .background(RoundedRectangle(cornerRadius: 12).fill(on ? Theme.Dark.accentBg : Theme.Dark.panel))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(on ? Theme.Dark.accentLine : Theme.Dark.line, lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
        }
    }

    @ViewBuilder
    private var methodContent: some View {
        switch builder.method {
        case .search: waypointList
        case .draw: drawInfo
        case .gpx: gpxInfo
        }
    }

    private var waypointList: some View {
        VStack(alignment: .leading, spacing: 0) {
            if builder.points.isEmpty {
                hint("Cherche un lieu ou touche la carte pour ajouter le départ.")
            } else {
                ScrollView {
                    VStack(spacing: 0) {
                        ForEach(Array(builder.points.enumerated()), id: \.element.id) { index, point in
                            waypointRow(point, index: index)
                        }
                    }
                    .background(alignment: .leading) {
                        Rectangle()
                            .stroke(style: StrokeStyle(lineWidth: 2, dash: [3, 4]))
                            .foregroundColor(Theme.Dark.lineStrong)
                            .frame(width: 1)
                            .padding(.vertical, 18)
                            .padding(.leading, 11.5)
                    }
                }
                .frame(height: min(CGFloat(builder.points.count) * 50, 125))
            }
            Button(action: onAddStop) {
                Label(builder.points.isEmpty ? "Ajouter le départ" : "Ajouter une étape", systemImage: "plus")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Theme.Dark.accent)
                    .padding(.leading, builder.points.isEmpty ? 0 : 36)
                    .padding(.top, 6)
            }
            .buttonStyle(.plain)
        }
    }

    private func waypointRow(_ point: RoutePoint, index: Int) -> some View {
        let isFirst = index == 0
        let isLast = index == builder.points.count - 1 && builder.points.count > 1
        let badge = isFirst ? "A" : (isLast ? "B" : "\(index)")
        let subtitle = isFirst ? "Départ" : (isLast ? "Arrivée" : "Étape")
        return HStack(spacing: 12) {
            WaypointBadge(label: badge, isStop: !isFirst && !isLast)
            HStack(spacing: 8) {
                VStack(alignment: .leading, spacing: 0) {
                    Text(point.name)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(Theme.Dark.text)
                        .lineLimit(1)
                    Text(subtitle)
                        .font(.system(size: 11))
                        .foregroundColor(Theme.Dark.muted)
                }
                Spacer(minLength: 0)
                if !isFirst && !isLast {
                    Button { builder.cyclePause(point.id) } label: {
                        Text(point.pauseMinutes == 0 ? "+ pause" : "⏸ \(point.pauseMinutes) min")
                            .font(.system(size: 11.5, weight: .medium))
                            .foregroundColor(Theme.Dark.accent)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(RoundedRectangle(cornerRadius: 8).fill(Theme.Dark.accentBg))
                    }
                    .buttonStyle(.plain)
                }
                Button { builder.remove(point.id) } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Theme.Dark.dim)
                        .frame(width: 24, height: 24)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(RoundedRectangle(cornerRadius: 12).fill(Theme.Dark.panel))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.Dark.line, lineWidth: 1))
        }
        .padding(.vertical, 3)
    }

    private var drawInfo: some View {
        VStack(alignment: .leading, spacing: 10) {
            hint("Touche la carte pour tracer ton trajet point par point.")
            HStack(spacing: 8) {
                Text("\(builder.points.count) point\(builder.points.count > 1 ? "s" : "")")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Theme.Dark.text)
                Spacer()
                smallButton("Annuler le dernier", icon: "arrow.uturn.backward") { builder.removeLast() }
                    .disabled(builder.points.isEmpty)
                smallButton("Effacer", icon: "trash") { builder.clear() }
                    .disabled(builder.points.isEmpty)
            }
        }
    }

    private var gpxInfo: some View {
        HStack(spacing: 12) {
            Image(systemName: "doc.text")
                .font(.system(size: 18))
                .foregroundColor(Theme.Dark.accent)
                .frame(width: 44, height: 44)
                .background(RoundedRectangle(cornerRadius: 12).fill(Theme.Dark.accentBg))
            VStack(alignment: .leading, spacing: 2) {
                Text(builder.gpxFileName ?? "Aucun fichier")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(Theme.Dark.text)
                    .lineLimit(1)
                Text(builder.gpxFileName == nil ? "Importe un fichier .gpx" : "\(builder.path.count) points")
                    .font(.system(size: 12))
                    .foregroundColor(Theme.Dark.muted)
            }
            Spacer()
            smallButton(builder.gpxFileName == nil ? "Importer" : "Changer", icon: "square.and.arrow.down") {
                showImporter = true
            }
        }
    }

    private var speeds: some View {
        HStack(spacing: 6) {
            ForEach(SpeedMode.allCases, id: \.self) { mode in
                if mode == .custom {
                    Menu {
                        ForEach([3, 8, 10, 20, 30, 90, 130], id: \.self) { v in
                            Button("\(v) km/h") {
                                builder.customKmh = Double(v)
                                builder.speedMode = .custom
                            }
                        }
                    } label: {
                        Chip(title: mode.label, subtitle: "\(Int(builder.customKmh)) km/h", isOn: builder.speedMode == .custom)
                    }
                } else {
                    Button { builder.speedMode = mode } label: {
                        Chip(title: mode.label, subtitle: "\(Int(mode.presetKmh ?? 0)) km/h", isOn: builder.speedMode == mode)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func hint(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 13.5))
            .foregroundColor(Theme.Dark.muted)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(RoundedRectangle(cornerRadius: 12).fill(Theme.Dark.panel))
    }

    private func smallButton(_ title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .font(.system(size: 12.5, weight: .medium))
                .foregroundColor(Theme.Dark.accent)
                .padding(.horizontal, 10)
                .frame(height: 32)
                .background(RoundedRectangle(cornerRadius: 10).fill(Theme.Dark.accentBg))
        }
        .buttonStyle(.plain)
    }
}
