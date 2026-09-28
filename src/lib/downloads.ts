export type DownloadPlatform =
  | "setup-mac"
  | "setup-win"
  | "setup-win-zip"
  | "apk";

export type DownloadAsset = {
  id: DownloadPlatform;
  label: string;
  description: string;
  filename: string;
  envKey: string;
  blobPath: string;
  alternateFilenames?: string[];
  alternateBlobPaths?: string[];
  hidden?: boolean;
};

export const DOWNLOAD_ASSETS: DownloadAsset[] = [
  {
    id: "setup-mac",
    label: "Anyloc (Mac)",
    description: "macOS Ventura ou plus récent — branche ton iPhone et installe en un clic",
    filename: "Anyloc.dmg",
    envKey: "ANYLOC_DOWNLOAD_SETUP_MAC",
    blobPath: "releases/Anyloc.dmg",
    alternateFilenames: ["Anyloc-Setup.dmg"],
    alternateBlobPaths: ["releases/Anyloc-Setup.dmg"],
  },
  {
    id: "setup-win",
    label: "Anyloc (Windows)",
    description: "Windows 10 ou plus récent — branche ton iPhone et installe en un clic",
    filename: "Anyloc-Setup.exe",
    envKey: "ANYLOC_DOWNLOAD_SETUP_WIN",
    blobPath: "releases/Anyloc-Setup.exe",
    alternateFilenames: ["Anyloc.exe", "anyloc-setup.exe"],
    alternateBlobPaths: ["releases/Anyloc.exe"],
  },
  {
    id: "setup-win-zip",
    label: "Anyloc (Windows, zip)",
    description:
      "Même programme, dans un zip — si Chrome refuse le .exe",
    filename: "Anyloc-Setup.zip",
    envKey: "ANYLOC_DOWNLOAD_SETUP_WIN_ZIP",
    blobPath: "releases/Anyloc-Setup.zip",
    hidden: true,
  },
  {
    id: "apk",
    label: "Anyloc (Android)",
    description: "APK signé pour installation directe sur Android",
    filename: "Anyloc.apk",
    envKey: "ANYLOC_DOWNLOAD_APK",
    blobPath: "releases/Anyloc.apk",
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

async function presignPrivateBlobUrl(pathname: string, token: string) {
  const { issueSignedToken, presignUrl } = await import("@vercel/blob");
  const signed = await issueSignedToken({
    token,
    pathname,
    operations: ["get"],
    validUntil: Date.now() + 60 * 60 * 1000,
  });

  const presignOptions = {
    operation: "get" as const,
    pathname,
    access: "private" as const,
  };
  const { presignedUrl } = await presignUrl(signed, presignOptions);

  return presignedUrl.replace(
    ".undefined.blob.vercel-storage.com",
    ".private.blob.vercel-storage.com"
  );
}

async function resolveBlobPath(pathname: string, token: string) {
  const { list, getDownloadUrl } = await import("@vercel/blob");
  const { blobs } = await list({
    prefix: pathname,
    limit: 10,
    token,
  });
  const blob = blobs.find((item) => item.pathname === pathname);

  if (!blob?.url) {
    return null;
  }

  if (blob.url.includes(".private.blob.vercel-storage.com")) {
    return presignPrivateBlobUrl(pathname, token);
  }

  return getDownloadUrl(blob.url);
}

async function resolveFromBlob(asset: DownloadAsset) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return null;
  }

  const paths = [
    asset.blobPath,
    ...(asset.alternateBlobPaths ?? []),
  ];

  for (const pathname of paths) {
    try {
      const url = await resolveBlobPath(pathname, token);
      if (url) {
        return url;
      }
    } catch {
      // Try the next blob path.
    }
  }

  return null;
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
        next: { revalidate: 120 },
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
      expiresAt: now + 2 * 60 * 1000,
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

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const pathname = new URL(url).pathname.replace(/^\/+/, "");

  if (token && pathname) {
    try {
      return await presignPrivateBlobUrl(pathname, token);
    } catch {
      // Fall through to the download-disposition URL.
    }
  }

  const { getDownloadUrl: getBlobDownloadUrl } = await import("@vercel/blob");
  return getBlobDownloadUrl(url);
}

async function resolveFromGithub(asset: DownloadAsset) {
  const releaseAssets = await fetchGithubReleaseAssets();
  const filenames = [
    asset.filename,
    ...(asset.alternateFilenames ?? []),
  ];

  for (const filename of filenames) {
    if (releaseAssets[filename]) {
      return releaseAssets[filename];
    }
  }

  return null;
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

  // GitHub first: each release has a unique URL. The Vercel Blob object
  // `releases/Anyloc.exe` was uploaded with a 1-year cache, so reinstalls
  // kept getting an old installer that never showed the launch tutorial.
  const githubUrl = await resolveFromGithub(asset);
  if (githubUrl) {
    return githubUrl;
  }

  return resolveFromBlob(asset);
}

export async function isDownloadAvailable(platform: DownloadPlatform) {
  return Boolean(await resolveDownloadUrl(platform));
}
