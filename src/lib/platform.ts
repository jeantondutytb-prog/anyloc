export type UserPlatform = "ios" | "android" | "unknown";

export function detectUserPlatform(userAgent: string): UserPlatform {
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return "ios";
  }

  if (/android/i.test(userAgent)) {
    return "android";
  }

  return "unknown";
}

export const IOS_INSTALL_CONSTRAINT =
  "Sur iPhone : un accès ponctuel à un Mac ou un PC est nécessaire pour l'installation (profil VPN). Ensuite, tout se gère depuis ton téléphone.";

export const ANDROID_INSTALL_NOTE =
  "Sur Android : installation 100 % depuis le téléphone, sans ordinateur.";
