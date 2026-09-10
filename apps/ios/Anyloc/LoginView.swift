import SwiftUI

struct LoginView: View {
    @ObservedObject var auth = AuthService.shared
    @State private var email = ""
    @State private var password = ""
    @State private var isSignup = false
    @State private var errorMessage = ""
    @State private var isSubmitting = false

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: 8) {
                    HStack(spacing: 0) {
                        Text("Any")
                            .font(.system(size: 42, weight: .bold))
                            .foregroundColor(Theme.text)
                        Text("loc")
                            .font(.system(size: 42, weight: .bold))
                            .foregroundColor(Theme.accent)
                    }

                    Text("Change ta position. Partout dans le monde.")
                        .font(.subheadline)
                        .foregroundColor(Theme.textMuted)
                }
                .padding(.bottom, 40)

                VStack(spacing: 16) {
                    // Google OAuth
                    Button {
                        Task { await googleLogin() }
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "globe")
                                .foregroundColor(Theme.text)
                            Text("Continuer avec Google")
                                .fontWeight(.medium)
                                .foregroundColor(Theme.text)
                        }
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
                    HStack(spacing: 12) {
                        Rectangle().fill(Theme.border).frame(height: 1)
                        Text("ou").font(.caption).foregroundColor(Theme.textDim)
                        Rectangle().fill(Theme.border).frame(height: 1)
                    }
                    .padding(.vertical, 4)

                    // Email
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
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

                    if !errorMessage.isEmpty {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundColor(Theme.error)
                            .multilineTextAlignment(.center)
                    }

                    // Submit
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

                    // Toggle signup
                    Button {
                        isSignup.toggle()
                        errorMessage = ""
                    } label: {
                        Text(isSignup ? "Déjà un compte ? " : "Pas encore de compte ? ")
                            .foregroundColor(Theme.textMuted) +
                        Text(isSignup ? "Se connecter" : "Créer un compte")
                            .foregroundColor(Theme.accent)
                    }
                    .font(.caption)
                }
                .padding(.horizontal, 32)

                Spacer()
            }
            .padding()
        }
        .preferredColorScheme(.dark)
    }

    private func emailLogin() async {
        isSubmitting = true
        errorMessage = ""
        do {
            if isSignup {
                try await auth.signup(email: email, password: password)
            } else {
                try await auth.login(email: email, password: password)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        isSubmitting = false
    }

    private func googleLogin() async {
        isSubmitting = true
        errorMessage = ""
        do {
            try await auth.loginWithGoogle()
        } catch is CancellationError {
            // user cancelled
        } catch {
            errorMessage = error.localizedDescription
        }
        isSubmitting = false
    }
}
