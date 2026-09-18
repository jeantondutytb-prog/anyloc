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

export function getClientDeviceSnapshot(): ClientDevice {
  if (typeof navigator === "undefined") {
    return SERVER_CLIENT_DEVICE;
  }

  clientDeviceCache ??= detectClientDevice();
  return clientDeviceCache;
}

export const IOS_INSTALL_CONSTRAINT =
  "Sur iPhone : un Mac ou un PC, une seule fois, avec un câble USB. Ensuite tout se fait depuis le téléphone.";

export const ANDROID_INSTALL_NOTE =
  "Sur Android : installation 100 % depuis le téléphone, sans ordinateur.";
