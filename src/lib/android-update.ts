/**
 * Latest Android build, for the in-app updater. CI publishes each APK as a
 * GitHub release tagged `android-v0.1.<run>`, and that run number is also the
 * APK's versionCode.
 */
const RELEASES_URL =
  "https://api.github.com/repos/jeantondutytb-prog/anyloc/releases?per_page=30";

export type AndroidRelease = {
  versionCode: number;
  versionName: string;
  downloadUrl: string;
};

type GithubRelease = {
  tag_name?: string;
  draft?: boolean;
  assets?: Array<{ name: string; browser_download_url: string }>;
};

export function parseAndroidTag(tag: string) {
  const match = /^android-v(\d+)\.(\d+)\.(\d+)$/.exec(tag);

  if (!match) {
    return null;
  }

  return {
    versionCode: Number(match[3]),
    versionName: `${match[1]}.${match[2]}.${match[3]}`,
  };
}

/** Highest released build that has its APK attached. */
export function pickLatestAndroidRelease(
  releases: GithubRelease[]
): AndroidRelease | null {
  let latest: AndroidRelease | null = null;

  for (const release of releases) {
    const version = release.draft ? null : parseAndroidTag(release.tag_name ?? "");
    const apk = release.assets?.find((asset) => asset.name === "Anyloc.apk");

    if (!version || !apk) {
      continue;
    }

    if (!latest || version.versionCode > latest.versionCode) {
      latest = { ...version, downloadUrl: apk.browser_download_url };
    }
  }

  return latest;
}

export async function fetchLatestAndroidRelease() {
  const githubToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const response = await fetch(RELEASES_URL, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "anyloc-android-update",
      ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    return null;
  }

  return pickLatestAndroidRelease((await response.json()) as GithubRelease[]);
}
