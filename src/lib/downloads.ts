export type DownloadPlatform = "setup-mac" | "setup-win" | "apk" | "ipa";

export type DownloadAsset = {
  id: DownloadPlatform;
  label: string;
  description: string;
  filename: string;
  envKey: string;
  blobPath: string;
};

export const DOWNLOAD_ASSETS: DownloadAsset[] = [
  {
    id: "setup-mac",
    label: "Anyloc Setup (Mac)",
    description: "macOS Ventura ou plus récent — installation iPhone via USB",
    filename: "Anyloc-Setup.dmg",
    envKey: "ANYLOC_DOWNLOAD_SETUP_MAC",
    blobPath: "releases/Anyloc-Setup.dmg",
  },
  {
    id: "setup-win",
    label: "Anyloc Setup (Windows)",
    description: "Windows 10 ou plus récent — installation iPhone via USB",
    filename: "Anyloc-Setup.exe",
    envKey: "ANYLOC_DOWNLOAD_SETUP_WIN",
    blobPath: "releases/Anyloc-Setup.exe",
  },
  {
    id: "apk",
    label: "Anyloc (Android)",
    description: "APK signé pour installation directe sur Android",
    filename: "Anyloc.apk",
    envKey: "ANYLOC_DOWNLOAD_APK",
    blobPath: "releases/Anyloc.apk",
  },
  {
    id: "ipa",
    label: "Anyloc (iPhone)",
    description: "IPA installée par Anyloc Setup via USB",
    filename: "Anyloc.ipa",
    envKey: "ANYLOC_DOWNLOAD_IPA",
    blobPath: "releases/Anyloc.ipa",
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

async function resolveFromBlob(asset: DownloadAsset) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return null;
  }

  try {
    const { list, getDownloadUrl } = await import("@vercel/blob");
    const { blobs } = await list({
      prefix: asset.blobPath,
      limit: 10,
      token,
    });
    const blob = blobs.find((item) => item.pathname === asset.blobPath);

    if (!blob?.url) {
      return null;
    }

    return getDownloadUrl(blob.url);
  } catch {
    return null;
  }
}

async function fetchGithubReleaseAssets() {
  const now = Date.now();

  if (githubReleaseCache && githubReleaseCache.expiresAt > now) {
    return githubReleaseCache.assets;
  }

  try {
    const githubToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_RELEASES_REPO}/releases?per_page=20`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "anyloc-downloads",
          ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
        },
        next: { revalidate: 600 },
      }
    );

    if (!response.ok) {
      return {};
    }

    const releases = (await response.json()) as Array<{
      assets?: Array<{ name: string; browser_download_url: string }>;
    }>;

    const assets: Record<string, string> = {};

    for (const release of releases) {
      for (const item of release.assets ?? []) {
        assets[item.name] ??= item.browser_download_url;
      }
    }

    githubReleaseCache = {
      expiresAt: now + 10 * 60 * 1000,
      assets,
    };

    return assets;
  } catch {
    return {};
  }
}

async function resolvePrivateBlobUrl(url: string): Promise<string> {
  if (!url.includes(".private.blob.vercel-storage.com")) {
    return url;
  }

  const { getDownloadUrl: getBlobDownloadUrl } = await import("@vercel/blob");
  return getBlobDownloadUrl(url);
}

export async function resolveDownloadUrl(platform: DownloadPlatform) {
  const envUrl = getDownloadUrl(platform);
  if (envUrl) {
    return resolvePrivateBlobUrl(envUrl);
  }

  const asset = getDownloadAsset(platform);
  if (!asset) {
    return null;
  }

  const blobUrl = await resolveFromBlob(asset);
  if (blobUrl) {
    return blobUrl;
  }

  const releaseAssets = await fetchGithubReleaseAssets();
  return releaseAssets[asset.filename] ?? null;
}

export async function isDownloadAvailable(platform: DownloadPlatform) {
  return Boolean(await resolveDownloadUrl(platform));
}
