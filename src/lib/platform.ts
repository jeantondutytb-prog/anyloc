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
  "Sur iPhone : un Mac ou un PC + câble USB. Tu changes la ville depuis le tel, mais l'iPhone reste branché et Anyloc Setup reste ouvert — sinon Snap revoit ta vraie position.";

export const IOS_APP_UNAVAILABLE_HINT =
  "iOS affiche « Anyloc n'est plus disponible » ? Branche l'iPhone, ouvre Anyloc Setup sur ton Mac ou PC, puis clique Réinstaller. C'est normal après une mise à jour ou quand le certificat de développement expire (~7 jours).";

export const IOS_SETUP_SYNC_HINT =
  "Tu changes de ville depuis le site ou l'iPhone mais rien ne bouge sur le PC ? Actualise Anyloc Setup (Cmd+R sur Mac, Ctrl+R sur Windows), reconnecte-toi si besoin, garde l'iPhone branché et déverrouillé, puis clique Revérifier.";

export const ANDROID_INSTALL_NOTE =
  "Sur Android : installation 100 % depuis le téléphone, sans ordinateur.";
