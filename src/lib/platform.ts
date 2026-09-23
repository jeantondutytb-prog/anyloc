export type UserPlatform = "ios" | "android" | "unknown";
export type DesktopOs = "mac" | "win";

export type ClientDevice = {
  isPhone: boolean;
  desktopOs: DesktopOs;
};

export const SERVER_CLIENT_DEVICE: ClientDevice = {
  isPhone: false,
  desktopOs: "mac",
};

let clientDeviceCache: ClientDevice | null = null;

export function detectUserPlatform(userAgent: string): UserPlatform {
  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return "ios";
  }

  if (/android/i.test(userAgent)) {
    return "android";
  }

  return "unknown";
}

export function detectClientDevice(): ClientDevice {
  if (typeof navigator === "undefined") {
    return SERVER_CLIENT_DEVICE;
  }

  const ua = navigator.userAgent;
  const isPhone = /iphone|ipad|ipod|android/i.test(ua);
  const desktopOs: DesktopOs = /win/i.test(ua) && !isPhone ? "win" : "mac";

  return { isPhone, desktopOs };
}

/** Stable snapshot for useSyncExternalStore — must return the same object reference. */
export function getClientDeviceSnapshot(): ClientDevice {
  if (typeof navigator === "undefined") {
    return SERVER_CLIENT_DEVICE;
  }

  clientDeviceCache ??= detectClientDevice();
  return clientDeviceCache;
}

export const IOS_INSTALL_CONSTRAINT =
  "Sur iPhone : un Mac ou PC une seule fois pour installer l'app, puis tout se pilote depuis ton téléphone — comme Locaflex.";

export const ANDROID_INSTALL_NOTE =
  "Sur Android : télécharge l'APK sur ton tel, l'app te guide — pas d'ordinateur.";
