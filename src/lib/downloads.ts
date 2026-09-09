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

const GITHUB_RELEASES_REPO = "jeantondutytb-prog/anyloc";

let githubReleaseCache: {
  expiresAt: number;
  assets: Record<string, string>;
} | null = null;

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

async function fetchGithubReleaseAssets() {
  const now = Date.now();

  if (githubReleaseCache && githubReleaseCache.expiresAt > now) {
    return githubReleaseCache.assets;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_RELEASES_REPO}/releases/latest`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "anyloc-downloads",
        },
        next: { revalidate: 600 },
      }
    );

    if (!response.ok) {
      return {};
    }

    const data = (await response.json()) as {
      assets?: Array<{ name: string; browser_download_url: string }>;
    };

    const assets = Object.fromEntries(
      (data.assets ?? []).map((item) => [item.name, item.browser_download_url])
    );

    githubReleaseCache = {
      expiresAt: now + 10 * 60 * 1000,
      assets,
    };

    return assets;
  } catch {
    return {};
  }
}

export async function resolveDownloadUrl(platform: DownloadPlatform) {
  const envUrl = getDownloadUrl(platform);
  if (envUrl) {
    return envUrl;
  }

  const asset = getDownloadAsset(platform);
  if (!asset) {
    return null;
  }

  if (platform === "setup-mac" || platform === "setup-win") {
    const releaseAssets = await fetchGithubReleaseAssets();
    return releaseAssets[asset.filename] ?? null;
  }

  return null;
}

export async function isDownloadAvailable(platform: DownloadPlatform) {
  return Boolean(await resolveDownloadUrl(platform));
}
