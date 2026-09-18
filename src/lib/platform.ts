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
  "Sur iPhone : un Mac ou un PC, une seule fois, avec un câble USB. Ensuite tout se fait depuis le téléphone.";

export const ANDROID_INSTALL_NOTE =
  "Sur Android : installation 100 % depuis le téléphone, sans ordinateur.";
