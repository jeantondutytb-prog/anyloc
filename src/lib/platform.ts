export type UserPlatform = "ios" | "android" | "unknown";
export type DesktopOs = "mac" | "win";

export type ClientDevice = {
  isPhone: boolean;
  isIos: boolean;
  desktopOs: DesktopOs;
};

export const SERVER_CLIENT_DEVICE: ClientDevice = {
  isPhone: false,
  isIos: false,
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
  const isIos = detectUserPlatform(ua) === "ios";
  const desktopOs: DesktopOs = /win/i.test(ua) && !isPhone ? "win" : "mac";

  return { isPhone, isIos, desktopOs };
}

/** Stable snapshot for useSyncExternalStore — must return the same object reference. */
export function getClientDeviceSnapshot(): ClientDevice {
  if (typeof navigator === "undefined") {
    return SERVER_CLIENT_DEVICE;
  }

  clientDeviceCache ??= detectClientDevice();
  return clientDeviceCache;
}

export type MacArch = "arm" | "intel" | "unknown";

type UaDataWithEntropy = {
  getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string }>;
};

/**
 * Apple Silicon or Intel? Every Mac browser says "Intel Mac OS X" in its UA,
 * and an arm64-only app on an Intel Mac fails with "n'est pas pris en charge
 * sur ce Mac". The Intel build runs on Apple Silicon through Rosetta, so when
 * in doubt between the two, Intel is the safe pick.
 */
export async function detectMacArch(): Promise<MacArch> {
  if (typeof navigator === "undefined") {
    return "unknown";
  }

  // Chrome / Edge: exact answer.
  const uaData = (navigator as Navigator & { userAgentData?: UaDataWithEntropy })
    .userAgentData;
  if (uaData?.getHighEntropyValues) {
    try {
      const { architecture } = await uaData.getHighEntropyValues(["architecture"]);
      if (architecture === "arm") return "arm";
      if (architecture === "x86") return "intel";
    } catch {
      // Fall back to the GPU.
    }
  }

  // Safari / Firefox: the GPU gives it away.
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
    if (!(gl instanceof WebGLRenderingContext)) {
      return "unknown";
    }

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
      : "";
    if (/apple m\d/i.test(renderer)) return "arm";
    if (/intel|amd|radeon|nvidia|geforce/i.test(renderer)) return "intel";

    // Safari masks the renderer as "Apple GPU": only Apple Silicon GPUs
    // support ASTC texture compression.
    return gl.getSupportedExtensions()?.includes("WEBGL_compressed_texture_astc")
      ? "arm"
      : "intel";
  } catch {
    return "unknown";
  }
}
