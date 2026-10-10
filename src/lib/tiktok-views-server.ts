import { createAdminClient } from "@/lib/supabase/admin";
import {
  TIKTOK_ACCOUNTS,
  VIDEOS_PER_ACCOUNT,
  buildDailyViewsCsv,
  computeViewsSince,
  parisDate,
  type PreviousSnapshot,
  type VideoCount,
} from "@/lib/tiktok-views";

const APIFY_ACTOR = "clockworks~tiktok-profile-scraper";
const SNAPSHOT_RETENTION_DAYS = 14;

type ApifyItem = {
  id?: string;
  playCount?: number;
  createTimeISO?: string;
  authorMeta?: { name?: string };
  input?: string;
  errorCode?: string;
  error?: string;
};

/** Reads the latest videos of every account through the Apify TikTok profile scraper. */
async function fetchVideoCounts(): Promise<{ videos: VideoCount[]; errors: string[] }> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error("APIFY_TOKEN is not configured.");
  }

  const response = await fetch(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?timeout=270`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profiles: TIKTOK_ACCOUNTS,
        resultsPerPage: VIDEOS_PER_ACCOUNT,
        profileSorting: "latest",
        excludePinnedPosts: false,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
        shouldDownloadSlideshowImages: false,
        shouldDownloadAvatars: false,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Apify run failed: ${response.status} ${await response.text()}`);
  }

  const items = (await response.json()) as ApifyItem[];
  const videos: VideoCount[] = [];
  const errors: string[] = [];

  for (const item of items) {
    if (item.errorCode || item.error) {
      errors.push(`${item.input ?? "?"}: ${item.errorCode ?? item.error}`);
      continue;
    }

    const account = item.authorMeta?.name?.toLowerCase();
    if (!item.id || !account || typeof item.playCount !== "number") {
      continue;
    }

    videos.push({
      account,
      videoId: item.id,
      createdAt: item.createTimeISO ? new Date(item.createTimeISO) : null,
      playCount: item.playCount,
    });
  }

  return { videos, errors };
}

async function getPreviousSnapshot(
  admin: ReturnType<typeof createAdminClient>,
  account: string,
  today: string
): Promise<(PreviousSnapshot & { date: string }) | null> {
  const { data: latest, error: latestError } = await admin
    .from("tiktok_video_snapshots")
    .select("snapshot_date, taken_at")
    .eq("account", account)
    .lt("snapshot_date", today)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw new Error(latestError.message);
  if (!latest) return null;

  const { data: rows, error } = await admin
    .from("tiktok_video_snapshots")
    .select("video_id, play_count")
    .eq("account", account)
    .eq("snapshot_date", latest.snapshot_date);

  if (error) throw new Error(error.message);

  return {
    date: latest.snapshot_date,
    takenAt: new Date(latest.taken_at),
    playCounts: new Map((rows ?? []).map((row) => [row.video_id, Number(row.play_count)])),
  };
}

/**
 * Evening run: snapshots every tracked video, then records each account's views
 * since its previous snapshot. The first run of an account only sets the baseline.
 */
export async function recordTikTokViews(now = new Date()) {
  const admin = createAdminClient();
  const today = parisDate(now);
  const { videos, errors } = await fetchVideoCounts();
  const accounts: Record<string, number | "baseline" | "no videos"> = {};

  for (const account of TIKTOK_ACCOUNTS) {
    const accountVideos = videos.filter((video) => video.account === account);
    if (accountVideos.length === 0) {
      accounts[account] = "no videos";
      continue;
    }

    const previous = await getPreviousSnapshot(admin, account, today);

    const { error: snapshotError } = await admin.from("tiktok_video_snapshots").upsert(
      accountVideos.map((video) => ({
        snapshot_date: today,
        account,
        video_id: video.videoId,
        video_created_at: video.createdAt?.toISOString() ?? null,
        play_count: video.playCount,
        taken_at: now.toISOString(),
      })),
      { onConflict: "snapshot_date,video_id" }
    );
    if (snapshotError) throw new Error(snapshotError.message);

    if (!previous) {
      accounts[account] = "baseline";
      continue;
    }

    const views = computeViewsSince(accountVideos, previous);
    const { error: viewsError } = await admin.from("tiktok_daily_views").upsert(
      {
        day: today,
        account,
        views,
        previous_date: previous.date,
        videos_tracked: accountVideos.length,
      },
      { onConflict: "day,account" }
    );
    if (viewsError) throw new Error(viewsError.message);

    accounts[account] = views;
  }

  const cutoff = new Date(now.getTime() - SNAPSHOT_RETENTION_DAYS * 24 * 3600 * 1000);
  await admin.from("tiktok_video_snapshots").delete().lt("snapshot_date", parisDate(cutoff));

  return { day: today, accounts, errors };
}

export async function getDailyViewsCsv() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tiktok_daily_views")
    .select("day, views")
    .order("day", { ascending: true })
    // 6 rows a day: past Supabase's default 1,000-row page within a year.
    .range(0, 9999);

  if (error) throw new Error(error.message);

  return buildDailyViewsCsv((data ?? []).map((row) => ({ day: row.day, views: Number(row.views) })));
}
