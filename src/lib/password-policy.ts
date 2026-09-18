export const MIN_PASSWORD_LENGTH = 10;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string) {
  const normalized = email.trim();

  if (!normalized) {
    return "Renseigne ton email.";
  }

  if (!EMAIL_PATTERN.test(normalized)) {
    return "Adresse email invalide.";
  }

  return null;
}

export function validatePassword(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }

  return null;
}
