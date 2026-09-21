# iOS App Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Anyloc iOS app from its current dark theme to a light theme aligned with the marketing site's brand (white/pale-pink background, pink→violet gradient accent), and clean up visual hierarchy on the Dashboard and subscription flow.

**Architecture:** All screens already consume colors exclusively through `Theme.swift` — no hardcoded hex values elsewhere. Redesign starts by rewriting `Theme.swift` (new light palette + a reusable gradient button style + card modifier), then each screen file is updated to (a) switch `.preferredColorScheme(.dark)` → `.light`, (b) adopt the shared button/card styles instead of ad-hoc `Theme.accent` fills, and (c) for Dashboard/Renewal/SubscriptionExpired, restructure content per the spec's hierarchy.

**Tech Stack:** SwiftUI, iOS 17+, Xcode project generated via `xcodegen` (`apps/ios/project.yml` → `apps/ios/Anyloc.xcodeproj`, scheme `Anyloc`). No existing automated UI test suite — verification is compile checks (`xcodebuild`) plus manual visual checks via the iOS Simulator tool.

**Spec:** [docs/superpowers/specs/2026-09-21-ios-redesign-design.md](../specs/2026-09-21-ios-redesign-design.md)

## Global Constraints

- Palette values come verbatim from `src/app/globals.css`: background `#FFF9FB`, surface `#FFFFFF`, surface-muted `#FDF2F8`, border `#E4E4E7`, foreground `#18181B`, muted `#71717A`, brand-hot `#EC4899`, brand-violet `#A855F7`.
- `success` (`#34D399`) and `error` (`#F87171`) tokens are unchanged from the current theme.
- No changes to business logic files: `AuthService.swift`, `LocationAPI.swift`, `SignatureRenewalService.swift`, `SubscriptionService.swift`, `SubscriptionModels.swift`.
- Android (`apps/android`) is out of scope.
- `FavoritesView.swift` exists but is not wired into any navigation today (confirmed via `grep -rn "FavoritesView(" apps/ios/Anyloc/` — no results). It still gets themed for consistency, since the spec lists it in scope, but this plan does not add it to `MainTabView` — that would be a navigation/IA change beyond the approved spec.
- `MainTabView`'s 3 tabs (Carte / Découvrir / Profil) already have explicit labels + SF Symbols; this plan does not rename them or add a 4th tab — it only re-themes and tightens the active/inactive visual state, since renaming would be a scope change beyond what was approved.
- Build check command used throughout: `xcodebuild -project apps/ios/Anyloc.xcodeproj -scheme Anyloc -destination 'generic/platform=iOS Simulator' -configuration Debug CODE_SIGNING_ALLOWED=NO build` (run from `/Users/jean/anyloc`). This compiles without needing a provisioning profile.

---

### Task 1: Rewrite `Theme.swift` — light palette + shared gradient button/card styles

**Files:**
- Modify: `apps/ios/Anyloc/Theme.swift`

**Interfaces:**
- Produces: `Theme.bg`, `Theme.bgSurface`, `Theme.bgSurfaceHover`, `Theme.border`, `Theme.text`, `Theme.textMuted`, `Theme.textDim`, `Theme.accentSolid` (`Color`), `Theme.accentGradient` (`LinearGradient`), `Theme.accentBg`, `Theme.success`, `Theme.error` — all `Color`/`LinearGradient` unless noted.
- Produces: `PrimaryGradientButtonStyle(isDisabled: Bool = false)` conforming to `ButtonStyle`.
- Produces: `View.cardBackground(cornerRadius: CGFloat = 14) -> some View`.
- Consumed by: every other task in this plan.

- [ ] **Step 1: Replace the contents of `Theme.swift`**

```swift
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
```

- [ ] **Step 2: Build check**

Run: `xcodebuild -project apps/ios/Anyloc.xcodeproj -scheme Anyloc -destination 'generic/platform=iOS Simulator' -configuration Debug CODE_SIGNING_ALLOWED=NO build`
Expected: build fails with errors in every screen file still referencing the old token names (`Theme.accent`, `.preferredColorScheme(.dark)` is still valid Swift so that alone won't fail — the failures will be `Theme.accent` no longer existing). This is expected at this point; later tasks fix each file. Confirm the *only* errors are "cannot find 'accent' in scope" (or similar) in `LoginView.swift`, `DashboardView.swift`, `RenewalView.swift`, `SubscriptionExpiredView.swift`, `MainTabView.swift`, `SpotsView.swift`, `SettingsView.swift` — i.e. `Theme.swift` itself compiles cleanly.

- [ ] **Step 3: Commit**

```bash
git add apps/ios/Anyloc/Theme.swift
git commit -m "$(cat <<'EOF'
Redesign iOS theme tokens to light palette matching the web brand

Replaces the dark theme with the site's light palette (#FFF9FB
background, pink-to-violet gradient accent) and adds shared
PrimaryGradientButtonStyle / cardBackground() so every screen can
reuse the same button and card look.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Re-theme `LoginView.swift`

**Files:**
- Modify: `apps/ios/Anyloc/LoginView.swift`

**Interfaces:**
- Consumes: `Theme.bg`, `Theme.bgSurface`, `Theme.border`, `Theme.text`, `Theme.textMuted`, `Theme.textDim`, `Theme.accentSolid`, `Theme.error`, `PrimaryGradientButtonStyle`, `.cardBackground()` (from Task 1).

- [ ] **Step 1: Switch logo accent and color scheme**

In `apps/ios/Anyloc/LoginView.swift`, replace:

```swift
                        Text("loc")
                            .font(.system(size: 42, weight: .bold))
                            .foregroundColor(Theme.accent)
```

with:

```swift
                        Text("loc")
                            .font(.system(size: 42, weight: .bold))
                            .foregroundColor(Theme.accentSolid)
```

Replace:

```swift
        .preferredColorScheme(.dark)
    }

    private func emailLogin() async {
```

with:

```swift
        .preferredColorScheme(.light)
    }

    private func emailLogin() async {
```

- [ ] **Step 2: Replace the Google button and the two text fields' card styling with `.cardBackground()`**

Replace:

```swift
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Theme.bgSurface)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Theme.border, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    // Divider
```

with:

```swift
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .cardBackground(cornerRadius: 12)
                    }

                    // Divider
```

Replace:

```swift
                        .padding(14)
                        .foregroundColor(Theme.text)
                        .background(Theme.bgSurface)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Theme.border, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 12))

                    // Password
                    SecureField("Mot de passe", text: $password)
                        .textContentType(isSignup ? .newPassword : .password)
                        .padding(14)
                        .foregroundColor(Theme.text)
                        .background(Theme.bgSurface)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Theme.border, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 12))
```

with:

```swift
                        .padding(14)
                        .foregroundColor(Theme.text)
                        .cardBackground(cornerRadius: 12)

                    // Password
                    SecureField("Mot de passe", text: $password)
                        .textContentType(isSignup ? .newPassword : .password)
                        .padding(14)
                        .foregroundColor(Theme.text)
                        .cardBackground(cornerRadius: 12)
```

- [ ] **Step 3: Switch the submit button to `PrimaryGradientButtonStyle`**

Replace:

```swift
                    Button {
                        Task { await emailLogin() }
                    } label: {
                        Text(isSignup ? "Créer mon compte" : "Se connecter")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Theme.accent)
                            .foregroundColor(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .disabled(isSubmitting || email.isEmpty || password.isEmpty)
                    .opacity(isSubmitting ? 0.5 : 1)
```

with:

```swift
                    Button {
                        Task { await emailLogin() }
                    } label: {
                        Text(isSignup ? "Créer mon compte" : "Se connecter")
                            .fontWeight(.semibold)
                    }
                    .buttonStyle(PrimaryGradientButtonStyle(isDisabled: isSubmitting || email.isEmpty || password.isEmpty))
                    .disabled(isSubmitting || email.isEmpty || password.isEmpty)
```

Replace the toggle-signup accent color:

```swift
                        Text(isSignup ? "Se connecter" : "Créer un compte")
                            .foregroundColor(Theme.accent)
```

with:

```swift
                        Text(isSignup ? "Se connecter" : "Créer un compte")
                            .foregroundColor(Theme.accentSolid)
```

- [ ] **Step 4: Build check**

Run: `xcodebuild -project apps/ios/Anyloc.xcodeproj -scheme Anyloc -destination 'generic/platform=iOS Simulator' -configuration Debug CODE_SIGNING_ALLOWED=NO build`
Expected: no errors originating from `LoginView.swift` (errors from other not-yet-updated files are still expected at this point).

- [ ] **Step 5: Commit**

```bash
git add apps/ios/Anyloc/LoginView.swift
git commit -m "$(cat <<'EOF'
Re-theme LoginView for the light palette

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Re-theme `MainTabView.swift`

**Files:**
- Modify: `apps/ios/Anyloc/MainTabView.swift`

**Interfaces:**
- Consumes: `Theme.bgSurface`, `Theme.border`, `Theme.accentSolid`, `Theme.textDim` (from Task 1).

- [ ] **Step 1: Re-theme the custom tab bar and color scheme**

Replace:

```swift
            .foregroundColor(selectedTab == tag ? Theme.accent : Theme.textDim)
```

with:

```swift
            .foregroundColor(selectedTab == tag ? Theme.accentSolid : Theme.textDim)
```

Replace:

```swift
            .background(Theme.bgSurface.opacity(0.95))
            .overlay(
                Rectangle().fill(Theme.border).frame(height: 1),
                alignment: .top
            )
        }
        .ignoresSafeArea(.keyboard)
        .preferredColorScheme(.dark)
```

with:

```swift
            .background(Theme.bgSurface.opacity(0.98))
            .overlay(
                Rectangle().fill(Theme.border).frame(height: 1),
                alignment: .top
            )
        }
        .ignoresSafeArea(.keyboard)
        .preferredColorScheme(.light)
```

- [ ] **Step 2: Build check**

Run: `xcodebuild -project apps/ios/Anyloc.xcodeproj -scheme Anyloc -destination 'generic/platform=iOS Simulator' -configuration Debug CODE_SIGNING_ALLOWED=NO build`
Expected: no errors originating from `MainTabView.swift`.

- [ ] **Step 3: Commit**

```bash
git add apps/ios/Anyloc/MainTabView.swift
git commit -m "$(cat <<'EOF'
Re-theme MainTabView tab bar for the light palette

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Re-theme and restructure `DashboardView.swift`

**Files:**
- Modify: `apps/ios/Anyloc/DashboardView.swift`

**Interfaces:**
- Consumes: `Theme.bg`, `Theme.bgSurface`, `Theme.bgSurfaceHover`, `Theme.border`, `Theme.text`, `Theme.textMuted`, `Theme.textDim`, `Theme.accentSolid`, `Theme.accentGradient`, `Theme.success`, `Theme.error`, `PrimaryGradientButtonStyle`, `.cardBackground()`.
- No changes to `DashboardViewModel` — this task only touches the `body`/subview computed properties above the `MARK: - ViewModel` line.

- [ ] **Step 1: Color scheme and map pin accent**

Replace:

```swift
        .preferredColorScheme(.dark)
        .task { await vm.loadCurrentLocation() }
```

with:

```swift
        .preferredColorScheme(.light)
        .task { await vm.loadCurrentLocation() }
```

Replace:

```swift
                        Image(systemName: "mappin.circle.fill")
                            .font(.title)
                            .foregroundStyle(Theme.accent)
```

with:

```swift
                        Image(systemName: "mappin.circle.fill")
                            .font(.title)
                            .foregroundStyle(Theme.accentSolid)
```

- [ ] **Step 2: Search bar and results card**

Replace:

```swift
            .padding(12)
            .background(Theme.bgSurface.opacity(0.92))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Theme.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 14))

            if !vm.searchResults.isEmpty {
```

with:

```swift
            .padding(12)
            .cardBackground(cornerRadius: 14)

            if !vm.searchResults.isEmpty {
```

Replace:

```swift
                .background(Theme.bgSurface.opacity(0.95))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Theme.border, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.top, 4)
            }
        }
        .padding(.horizontal)
        .padding(.top, 8)
    }
```

with:

```swift
                .cardBackground(cornerRadius: 12)
                .padding(.top, 4)
            }
        }
        .padding(.horizontal)
        .padding(.top, 8)
    }
```

- [ ] **Step 3: Restructure the bottom sheet into a status-first layout**

This is the Dashboard's main hierarchy change from the spec: the
position/status becomes a prominent header row inside the sheet (name +
active/inactive badge), with the teleport/stop/favorite actions right
below it as clearly secondary controls. Replace the whole `bottomSheet`
computed property with:

```swift
    private var bottomSheet: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let pos = vm.selectedPosition {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) {
                            Circle()
                                .fill(vm.isActive ? Theme.success : Theme.textDim)
                                .frame(width: 8, height: 8)
                            Text(vm.isActive ? "Actif" : "Inactif")
                                .font(.caption.bold())
                                .foregroundColor(vm.isActive ? Theme.success : Theme.textDim)
                        }
                        Text(pos.name)
                            .font(.title3.bold())
                            .foregroundColor(Theme.text)
                            .lineLimit(1)
                        Text("\(pos.lat, specifier: "%.5f"), \(pos.lng, specifier: "%.5f")")
                            .font(.system(.caption2, design: .monospaced))
                            .foregroundColor(Theme.textMuted)
                    }
                    Spacer()
                    Button {
                        vm.saveFavorite()
                    } label: {
                        Image(systemName: "heart.fill")
                            .font(.caption)
                            .foregroundColor(Theme.textMuted)
                            .padding(8)
                            .background(Theme.bgSurfaceHover)
                            .clipShape(Circle())
                    }
                }

                HStack(spacing: 8) {
                    Button {
                        Task { await vm.teleport() }
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "location.fill")
                            Text(vm.isActive ? "Mettre à jour" : "Téléporter")
                        }
                    }
                    .buttonStyle(PrimaryGradientButtonStyle(isDisabled: vm.isSaving))
                    .disabled(vm.isSaving)

                    if vm.isActive {
                        Button {
                            Task { await vm.stopSpoof() }
                        } label: {
                            Text("Stop")
                                .font(.subheadline.bold())
                                .padding(.vertical, 10)
                                .padding(.horizontal, 16)
                                .background(Theme.error.opacity(0.12))
                                .foregroundColor(Theme.error)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                    }
                }
            } else {
                Text("Touche la carte ou cherche un lieu")
                    .font(.subheadline)
                    .foregroundColor(Theme.textDim)
                    .padding(.vertical, 4)
            }

            if !vm.statusMessage.isEmpty {
                Text(vm.statusMessage)
                    .font(.caption.bold())
                    .foregroundColor(vm.statusIsError ? Theme.error : Theme.success)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background((vm.statusIsError ? Theme.error : Theme.success).opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .transition(.opacity)
            }

            // Favorites
            if !vm.favorites.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(vm.favorites, id: \.name) { fav in
                            Button {
                                vm.selectPosition(lat: fav.lat, lng: fav.lng, name: fav.name)
                                vm.cameraPosition = .region(MKCoordinateRegion(
                                    center: CLLocationCoordinate2D(latitude: fav.lat, longitude: fav.lng),
                                    span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
                                ))
                            } label: {
                                Text(fav.name)
                                    .font(.caption2)
                                    .foregroundColor(Theme.textMuted)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Theme.bgSurfaceHover)
                                    .clipShape(Capsule())
                            }
                        }
                    }
                }
            }

        }
        .padding(12)
        .cardBackground(cornerRadius: 16)
        .padding(.horizontal, 8)
        .padding(.bottom, 64)
    }
```

- [ ] **Step 4: Build check**

Run: `xcodebuild -project apps/ios/Anyloc.xcodeproj -scheme Anyloc -destination 'generic/platform=iOS Simulator' -configuration Debug CODE_SIGNING_ALLOWED=NO build`
Expected: no errors originating from `DashboardView.swift`.

- [ ] **Step 5: Commit**

```bash
git add apps/ios/Anyloc/DashboardView.swift
git commit -m "$(cat <<'EOF'
Redesign Dashboard: light theme + status-first bottom sheet

Puts current position + active/inactive status in a clear header row,
with teleport/stop as secondary actions below, instead of the status
message being buried under the action buttons.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Re-theme and simplify `RenewalView.swift`

**Files:**
- Modify: `apps/ios/Anyloc/RenewalView.swift`

**Interfaces:**
- Consumes: `Theme.bg`, `Theme.bgSurface`, `Theme.border`, `Theme.text`, `Theme.textMuted`, `Theme.textDim`, `Theme.accentSolid`, `Theme.accentGradient`, `Theme.success`, `Theme.error`, `PrimaryGradientButtonStyle`, `.cardBackground()`.
- Does not modify `RenewalBanner` (Task 6 handles it) or `SignatureRenewalService`.

- [ ] **Step 1: Color scheme**

Replace:

```swift
        .preferredColorScheme(.dark)
        .task {
            await renewal.refreshPairingStatus()
        }
    }

    private var header: some View {
```

with:

```swift
        .preferredColorScheme(.light)
        .task {
            await renewal.refreshPairingStatus()
        }
    }

    private var header: some View {
```

- [ ] **Step 2: `statusCard` and `stepsCard` → `.cardBackground()`**

Replace (in `statusCard`):

```swift
        .padding(16)
        .background(Theme.bgSurface)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Theme.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var stepsCard: some View {
```

with:

```swift
        .padding(16)
        .cardBackground()
    }

    private var stepsCard: some View {
```

Replace (in `stepsCard`, the matching block right after `renewalStep(number: 3, ...)`):

```swift
        .padding(16)
        .background(Theme.bgSurface)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Theme.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var actions: some View {
```

with:

```swift
        .padding(16)
        .cardBackground()
    }

    private var actions: some View {
```

- [ ] **Step 3: `actions` — single clear primary CTA in the brand gradient**

Replace:

```swift
            Button {
                renewal.openLocalDevVpnStore()
            } label: {
                Label("Installer / ouvrir LocalDevVPN", systemImage: "arrow.down.app")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Theme.bgSurface)
                    .foregroundColor(Theme.text)
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(Theme.border, lineWidth: 1)
                    )
            }

            Toggle(isOn: $localDevConnected) {
                Text("LocalDevVPN est connecté (bouton vert)")
                    .font(.subheadline)
                    .foregroundColor(Theme.text)
            }
            .tint(Theme.accent)
            .padding(.horizontal, 4)

            Button {
                Task { await runRenewal() }
            } label: {
                HStack {
                    if isWorking {
                        ProgressView()
                            .tint(.white)
                    }
                    Text(isWorking ? "Vérification…" : "Renouveler")
                        .font(.headline)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(localDevConnected && !isWorking ? Theme.accent : Theme.accent.opacity(0.45))
                .foregroundColor(.white)
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .disabled(!localDevConnected || isWorking)

            if let message = renewal.statusMessage {
                Text(message)
                    .font(.footnote)
                    .foregroundColor(Theme.textMuted)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(Theme.bgSurface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }
```

with:

```swift
            Button {
                renewal.openLocalDevVpnStore()
            } label: {
                Label("Installer / ouvrir LocalDevVPN", systemImage: "arrow.down.app")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .foregroundColor(Theme.text)
            }
            .cardBackground()

            Toggle(isOn: $localDevConnected) {
                Text("LocalDevVPN est connecté (bouton vert)")
                    .font(.subheadline)
                    .foregroundColor(Theme.text)
            }
            .tint(Theme.accentSolid)
            .padding(.horizontal, 4)

            Button {
                Task { await runRenewal() }
            } label: {
                HStack {
                    if isWorking {
                        ProgressView()
                            .tint(.white)
                    }
                    Text(isWorking ? "Vérification…" : "Renouveler")
                }
            }
            .buttonStyle(PrimaryGradientButtonStyle(isDisabled: !localDevConnected || isWorking))
            .disabled(!localDevConnected || isWorking)

            if let message = renewal.statusMessage {
                Text(message)
                    .font(.footnote)
                    .foregroundColor(Theme.textMuted)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .cardBackground(cornerRadius: 12)
            }
        }
    }
```

- [ ] **Step 4: `helpCard`, step numbers and status pill accents**

Replace:

```swift
        .padding(16)
        .background(Theme.accent.opacity(0.08))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Theme.accent.opacity(0.25), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func renewalStep(number: Int, title: String, detail: String) -> some View {
```

with:

```swift
        .padding(16)
        .background(Theme.accentSolid.opacity(0.08))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Theme.accentSolid.opacity(0.25), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func renewalStep(number: Int, title: String, detail: String) -> some View {
```

Replace:

```swift
                .foregroundColor(.white)
                .frame(width: 24, height: 24)
                .background(Theme.accent)
                .clipShape(Circle())
```

with:

```swift
                .foregroundColor(.white)
                .frame(width: 24, height: 24)
                .background(Theme.accentSolid)
                .clipShape(Circle())
```

Replace:

```swift
            Button("Voir le guide sur le site") {
                renewal.openRenewalHelp()
            }
            .font(.footnote.weight(.semibold))
            .foregroundColor(Theme.accent)
        }
```

with:

```swift
            Button("Voir le guide sur le site") {
                renewal.openRenewalHelp()
            }
            .font(.footnote.weight(.semibold))
            .foregroundColor(Theme.accentSolid)
        }
```

- [ ] **Step 5: Build check**

Run: `xcodebuild -project apps/ios/Anyloc.xcodeproj -scheme Anyloc -destination 'generic/platform=iOS Simulator' -configuration Debug CODE_SIGNING_ALLOWED=NO build`
Expected: no errors originating from `RenewalView.swift`'s `RenewalView` struct. `RenewalBanner` (same file) may still reference `Theme.accent`-free code — it doesn't use `Theme.accent`, so it should already compile; if it doesn't, re-check for typos introduced by the replacements above.

- [ ] **Step 6: Commit**

```bash
git add apps/ios/Anyloc/RenewalView.swift
git commit -m "$(cat <<'EOF'
Re-theme RenewalView with a single gradient primary CTA

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Re-theme `SubscriptionExpiredView.swift` and `RenewalBanner`

**Files:**
- Modify: `apps/ios/Anyloc/SubscriptionExpiredView.swift`
- Modify: `apps/ios/Anyloc/RenewalView.swift` (the `RenewalBanner` struct only — grouped here because both are small "attention" surfaces that reuse the same orange-alert pattern)

**Interfaces:**
- Consumes: `Theme.bg`, `Theme.bgSurface`, `Theme.border`, `Theme.text`, `Theme.textMuted`, `Theme.textDim`, `Theme.accentSolid`, `PrimaryGradientButtonStyle`, `.cardBackground()`.

- [ ] **Step 1: `SubscriptionExpiredView` — color scheme and icon accents**

Replace:

```swift
                            Image(systemName: "mappin.circle.fill")
                                .foregroundColor(Theme.accent)
```

with:

```swift
                            Image(systemName: "mappin.circle.fill")
                                .foregroundColor(Theme.accentSolid)
```

Replace:

```swift
                    iconView
                        .frame(width: 48, height: 48)
                        .background(Theme.bgSurface)
                        .overlay(
                            RoundedRectangle(cornerRadius: 14)
                                .stroke(Theme.border, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 14))
```

with:

```swift
                    iconView
                        .frame(width: 48, height: 48)
                        .cardBackground(cornerRadius: 14)
```

Replace:

```swift
                        if let planName = details.previousPlanName, !planName.isEmpty {
                            Text("Dernière formule : \(planName)")
                                .font(.subheadline)
                                .foregroundColor(Theme.textMuted)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(14)
                                .background(Theme.bgSurface)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(Theme.border, lineWidth: 1)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                        }

                        Button {
                            openURL(details.checkoutUrl)
                        } label: {
                            Text(details.ctaLabel)
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Theme.accent)
                                .foregroundColor(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                        }

                        Button {
                            openURL(details.pricingUrl)
                        } label: {
                            Text("Comparer les offres")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Theme.bgSurface)
                                .foregroundColor(Theme.text)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(Theme.border, lineWidth: 1)
                                )
                        }
```

with:

```swift
                        if let planName = details.previousPlanName, !planName.isEmpty {
                            Text("Dernière formule : \(planName)")
                                .font(.subheadline)
                                .foregroundColor(Theme.textMuted)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(14)
                                .cardBackground(cornerRadius: 14)
                        }

                        Button {
                            openURL(details.checkoutUrl)
                        } label: {
                            Text(details.ctaLabel)
                        }
                        .buttonStyle(PrimaryGradientButtonStyle())

                        Button {
                            openURL(details.pricingUrl)
                        } label: {
                            Text("Comparer les offres")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .foregroundColor(Theme.text)
                        }
                        .cardBackground(cornerRadius: 14)
```

Replace:

```swift
                .padding(24)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Theme.bgSurface.opacity(0.95))
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(Theme.accent.opacity(0.25), lineWidth: 1)
                        )
                )
```

with:

```swift
                .padding(24)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(Theme.bgSurface)
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(Theme.accentSolid.opacity(0.25), lineWidth: 1)
                        )
                )
```

Replace:

```swift
                .padding(20)
            }
        }
        .preferredColorScheme(.dark)
    }

    @ViewBuilder
    private var iconView: some View {
        switch details.reason {
        case "payment_failed":
            Image(systemName: "creditcard.fill")
                .foregroundColor(.orange)
        case "trial_cancelled", "trial_ended":
            Image(systemName: "sparkles")
                .foregroundColor(Theme.accent)
```

with:

```swift
                .padding(20)
            }
        }
        .preferredColorScheme(.light)
    }

    @ViewBuilder
    private var iconView: some View {
        switch details.reason {
        case "payment_failed":
            Image(systemName: "creditcard.fill")
                .foregroundColor(.orange)
        case "trial_cancelled", "trial_ended":
            Image(systemName: "sparkles")
                .foregroundColor(Theme.accentSolid)
```

- [ ] **Step 2: `RenewalBanner` (in `RenewalView.swift`) — theme the orange alert card**

The banner already uses `Color.orange` (unrelated to `Theme.accent`), so it needs no token renames, only a background/border tweak so it reads correctly against the new light `Theme.bg`. Replace:

```swift
                .padding(12)
                .background(Color.orange.opacity(0.12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.orange.opacity(0.35), lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)
```

with:

```swift
                .padding(12)
                .background(Color.orange.opacity(0.10))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.orange.opacity(0.30), lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .buttonStyle(.plain)
```

- [ ] **Step 3: Build check**

Run: `xcodebuild -project apps/ios/Anyloc.xcodeproj -scheme Anyloc -destination 'generic/platform=iOS Simulator' -configuration Debug CODE_SIGNING_ALLOWED=NO build`
Expected: no errors originating from `SubscriptionExpiredView.swift` or `RenewalView.swift`.

- [ ] **Step 4: Commit**

```bash
git add apps/ios/Anyloc/SubscriptionExpiredView.swift apps/ios/Anyloc/RenewalView.swift
git commit -m "$(cat <<'EOF'
Re-theme SubscriptionExpiredView and RenewalBanner for the light palette

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Re-theme `SpotsView.swift`, `FavoritesView.swift`, `SettingsView.swift`

**Files:**
- Modify: `apps/ios/Anyloc/SpotsView.swift`
- Modify: `apps/ios/Anyloc/FavoritesView.swift`
- Modify: `apps/ios/Anyloc/SettingsView.swift`

**Interfaces:**
- Consumes: `Theme.accentSolid`, `.cardBackground()`, `PrimaryGradientButtonStyle` (from Task 1). None of these three files set `.preferredColorScheme` themselves — they inherit it from `MainTabView` (Task 3) or, for `SettingsView`'s embedded `RenewalView` sheet, from Task 5/6 — so no color-scheme change is needed here.

- [ ] **Step 1: `SpotsView.swift` — category pills and card borders**

Replace:

```swift
                                    .background(vm.selectedCategory == cat.id ? Theme.accent : Theme.bgSurfaceHover)
```

with:

```swift
                                    .background(vm.selectedCategory == cat.id ? Theme.accentSolid : Theme.bgSurfaceHover)
```

Replace:

```swift
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .padding(.horizontal, 8)
                                .background(Theme.bgSurface)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(Theme.border, lineWidth: 1)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 14))
```

with:

```swift
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .padding(.horizontal, 8)
                                .cardBackground(cornerRadius: 14)
```

- [ ] **Step 2: `FavoritesView.swift` — pin accent, "Go" button, row card**

Replace:

```swift
                                    Image(systemName: "mappin.circle.fill")
                                        .font(.title3)
                                        .foregroundColor(Theme.accent)
```

with:

```swift
                                    Image(systemName: "mappin.circle.fill")
                                        .font(.title3)
                                        .foregroundColor(Theme.accentSolid)
```

Replace:

```swift
                                    Button {
                                        Task { await vm.teleport(fav) }
                                    } label: {
                                        Text("Go")
                                            .font(.caption.bold())
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 6)
                                            .background(Theme.accent)
                                            .foregroundColor(.white)
                                            .clipShape(Capsule())
                                    }
```

with:

```swift
                                    Button {
                                        Task { await vm.teleport(fav) }
                                    } label: {
                                        Text("Go")
                                            .font(.caption.bold())
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 6)
                                            .background(Theme.accentGradient)
                                            .foregroundColor(.white)
                                            .clipShape(Capsule())
                                    }
```

Replace:

```swift
                                .padding(12)
                                .background(Theme.bgSurface)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Theme.border, lineWidth: 1)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 80)
                    }
                }
            }
        }
    }
```

with:

```swift
                                .padding(12)
                                .cardBackground(cornerRadius: 12)
                            }
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 80)
                    }
                }
            }
        }
    }
```

- [ ] **Step 3: `SettingsView.swift` — icons, section cards, plan CTA, renew button, logout button**

Replace:

```swift
                                    Image(systemName: "crown.fill")
                                        .font(.title2)
                                        .foregroundColor(Theme.accent)
```

with:

```swift
                                    Image(systemName: "crown.fill")
                                        .font(.title2)
                                        .foregroundColor(Theme.accentSolid)
```

Replace:

```swift
                                    Image(systemName: "arrow.clockwise.circle.fill")
                                        .font(.title2)
                                        .foregroundColor(Theme.accent)
```

with:

```swift
                                    Image(systemName: "arrow.clockwise.circle.fill")
                                        .font(.title2)
                                        .foregroundColor(Theme.accentSolid)
```

Replace:

```swift
                                Button {
                                    showRenewal = true
                                } label: {
                                    Text("Renouveler maintenant")
                                        .font(.subheadline.bold())
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .background(Theme.accent)
                                        .foregroundColor(.white)
                                        .clipShape(RoundedRectangle(cornerRadius: 10))
                                }
```

with:

```swift
                                Button {
                                    showRenewal = true
                                } label: {
                                    Text("Renouveler maintenant")
                                        .font(.subheadline.bold())
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 10)
                                        .background(Theme.accentGradient)
                                        .foregroundColor(.white)
                                        .clipShape(RoundedRectangle(cornerRadius: 10))
                                }
```

Replace the section card wrapper:

```swift
            VStack(spacing: 0) {
                content()
            }
            .background(Theme.bgSurface)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Theme.border, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
```

with:

```swift
            VStack(spacing: 0) {
                content()
            }
            .cardBackground(cornerRadius: 12)
        }
    }
```

Replace the plan card's "POPULAIRE" badge and price/CTA accents:

```swift
                        if popular {
                            Text("POPULAIRE")
                                .font(.system(size: 9, weight: .heavy))
                                .foregroundColor(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Theme.accent)
                                .clipShape(Capsule())
                        }
                    }
                    HStack(alignment: .firstTextBaseline, spacing: 2) {
                        Text(perDay)
                            .font(.title2.bold())
                            .foregroundColor(Theme.accent)
```

with:

```swift
                        if popular {
                            Text("POPULAIRE")
                                .font(.system(size: 9, weight: .heavy))
                                .foregroundColor(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Theme.accentGradient)
                                .clipShape(Capsule())
                        }
                    }
                    HStack(alignment: .firstTextBaseline, spacing: 2) {
                        Text(perDay)
                            .font(.title2.bold())
                            .foregroundColor(Theme.accentSolid)
```

Replace the plan card CTA pill and outer card background:

```swift
                        .background(popular ? Theme.accent : Theme.bgSurfaceHover)
                        .foregroundColor(popular ? .white : Theme.text)
                        .clipShape(Capsule())
                        .overlay(
                            Capsule().stroke(popular ? Color.clear : Theme.border, lineWidth: 1)
                        )
                }
            }

            HStack(spacing: 12) {
                ForEach(features, id: \.self) { f in
                    HStack(spacing: 3) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundColor(Theme.success)
                        Text(f)
                            .font(.system(size: 10))
                            .foregroundColor(Theme.textDim)
                            .lineLimit(1)
                    }
                }
                Spacer()
            }
        }
        .padding(12)
        .background(popular ? Theme.accent.opacity(0.06) : Theme.bg)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(popular ? Theme.accent.opacity(0.3) : Theme.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}
```

with:

```swift
                        .background(popular ? AnyShapeStyle(Theme.accentGradient) : AnyShapeStyle(Theme.bgSurfaceHover))
                        .foregroundColor(popular ? .white : Theme.text)
                        .clipShape(Capsule())
                        .overlay(
                            Capsule().stroke(popular ? Color.clear : Theme.border, lineWidth: 1)
                        )
                }
            }

            HStack(spacing: 12) {
                ForEach(features, id: \.self) { f in
                    HStack(spacing: 3) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundColor(Theme.success)
                        Text(f)
                            .font(.system(size: 10))
                            .foregroundColor(Theme.textDim)
                            .lineLimit(1)
                    }
                }
                Spacer()
            }
        }
        .padding(12)
        .background(popular ? Theme.accentSolid.opacity(0.06) : Theme.bg)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(popular ? Theme.accentSolid.opacity(0.3) : Theme.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}
```

Replace the logout row's error color usage — no token rename needed
(`Theme.error` is unchanged), skip.

- [ ] **Step 4: Build check**

Run: `xcodebuild -project apps/ios/Anyloc.xcodeproj -scheme Anyloc -destination 'generic/platform=iOS Simulator' -configuration Debug CODE_SIGNING_ALLOWED=NO build`
Expected: **build succeeds with no errors** — this is the last file referencing the old `Theme.accent` token, so the whole target should now compile cleanly.

- [ ] **Step 5: Commit**

```bash
git add apps/ios/Anyloc/SpotsView.swift apps/ios/Anyloc/FavoritesView.swift apps/ios/Anyloc/SettingsView.swift
git commit -m "$(cat <<'EOF'
Re-theme Spots, Favorites and Settings views for the light palette

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Full-app visual verification in the iOS Simulator

**Files:** none (verification only).

**Interfaces:**
- Consumes: the finished app from Tasks 1–7. Uses `mcp__Claude_Code_iOS_Simulator__control` (`attach`, `launch`, `screenshot`, `tap`, `text`, `inspect`) per the tool's own instructions.

- [ ] **Step 1: Build for the simulator**

Run: `xcodebuild -project apps/ios/Anyloc.xcodeproj -scheme Anyloc -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -configuration Debug -derivedDataPath build/DerivedData build`
Expected: `** BUILD SUCCEEDED **`. Note the `.app` path this prints under `build/DerivedData/Build/Products/Debug-iphonesimulator/Anyloc.app`.

- [ ] **Step 2: Attach the simulator panel, then launch the app**

Call `mcp__Claude_Code_iOS_Simulator__control` with `action: "attach"` (boot an iPhone simulator first via `xcrun simctl boot "iPhone 17 Pro"` if none is booted, then retry `attach`), then with `action: "launch"` and `app_path` set to the `.app` from Step 1.

- [ ] **Step 3: Screenshot the login screen**

Call `action: "screenshot"`. Confirm: white/pale-pink background (not black), "Anyloc" wordmark with pink `loc`, email/password fields with visible light borders, "Se connecter" button showing the pink→violet gradient — not a flat dark tile.

- [ ] **Step 4: Log in and screenshot the Dashboard**

Use `action: "text"` / `action: "tap"` to submit valid test credentials (ask the user for a test account if none is already configured in the simulator), then `action: "screenshot"` on the Dashboard tab. Confirm: light map background, bottom sheet is a white card with visible border, and once a position is selected the status header shows the "Actif"/"Inactif" dot + label above the place name (the restructured hierarchy from Task 4), with the teleport button in the gradient style.

- [ ] **Step 5: Screenshot Spots and Réglages tabs**

Tap through the custom tab bar (`action: "tap"` on the tab bar icons found via `action: "inspect"`), screenshot each. Confirm: category pills use the solid pink accent when selected, plan cards in Réglages show the gradient "POPULAIRE" badge and CTA pill, all against the light background.

- [ ] **Step 6: Trigger and screenshot the Renewal sheet**

From Réglages, tap "Renouveler maintenant", screenshot the resulting sheet. Confirm: light background, single gradient "Renouveler" CTA, step badges in solid pink, no dark-mode remnants.

- [ ] **Step 7: Report and detach**

Summarize any visual issue found (contrast, wrong color, clipped gradient) — if any step 3–6 shows a problem, fix the relevant file from Tasks 1–7, rebuild, and re-screenshot before proceeding. Once all screens check out, call `action: "detach"`.

No commit for this task — it's verification only, and any fixes it triggers are committed as amendments to the task they belong to (re-open that task's commit as a new fix-up commit, don't rewrite history).
