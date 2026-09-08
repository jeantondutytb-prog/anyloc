export type DownloadPlatform = "setup-mac" | "setup-win" | "apk";

export type DownloadAsset = {
  id: DownloadPlatform;
  label: string;
  description: string;
  filename: string;
  envKey: string;
};

export const DOWNLOAD_ASSETS: DownloadAsset[] = [
  {
    id: "setup-mac",
    label: "Anyloc Setup (Mac)",
    description: "macOS Ventura ou plus récent — installation iPhone via USB",
    filename: "Anyloc-Setup.dmg",
    envKey: "ANYLOC_DOWNLOAD_SETUP_MAC",
  },
  {
    id: "setup-win",
    label: "Anyloc Setup (Windows)",
    description: "Windows 10 ou plus récent — installation iPhone via USB",
    filename: "Anyloc-Setup.exe",
    envKey: "ANYLOC_DOWNLOAD_SETUP_WIN",
  },
  {
    id: "apk",
    label: "Anyloc (Android)",
    description: "APK signé pour installation directe sur Android",
    filename: "Anyloc.apk",
    envKey: "ANYLOC_DOWNLOAD_APK",
  },
];

export function isValidDownloadPlatform(
  value: string
): value is DownloadPlatform {
  return DOWNLOAD_ASSETS.some((asset) => asset.id === value);
}

export function getDownloadAsset(platform: DownloadPlatform) {
  return DOWNLOAD_ASSETS.find((asset) => asset.id === platform) ?? null;
}

export function getDownloadUrl(platform: DownloadPlatform) {
  const asset = getDownloadAsset(platform);

  if (!asset) {
    return null;
  }

  const url = process.env[asset.envKey]?.trim();
  return url || null;
}
