/** Anyloc TikTok accounts whose views are tracked every evening. */
export const TIKTOK_ACCOUNTS = [
  "antoine.ckts",
  "chloe.rtps",
  "emma.ftpl",
  "emma.srtp",
  "margaux.fgts",
  "mateo.ltpr",
] as const;

/** Most recent videos read per account on each run (each one is a billed Apify result). */
export const VIDEOS_PER_ACCOUNT = 50;

export type VideoCount = {
  account: string;
  videoId: string;
  createdAt: Date | null;
  playCount: number;
};

export type PreviousSnapshot = {
  takenAt: Date;
  playCounts: Map<string, number>;
};

/**
 * Views an account gained since the previous snapshot: the growth of every video
 * seen both times, plus the full count of videos posted after that snapshot.
 * Videos missing from the previous snapshot but older than it add nothing, since
 * their starting count is unknown. A count that went down counts as zero.
 */
export function computeViewsSince(videos: VideoCount[], previous: PreviousSnapshot): number {
  let views = 0;

  for (const video of videos) {
    const before = previous.playCounts.get(video.videoId);

    if (before !== undefined) {
      views += Math.max(0, video.playCount - before);
    } else if (video.createdAt && video.createdAt > previous.takenAt) {
      views += video.playCount;
    }
  }

  return views;
}

/** Calendar date in Paris (YYYY-MM-DD), the day the sheet files a run under. */
export function parisDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** CSV read by the sheet: one line per day, total views of all accounts. */
export function buildDailyViewsCsv(rows: { day: string; views: number }[]): string {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.day, (totals.get(row.day) ?? 0) + row.views);
  }

  const lines = [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, views]) => `${day},${views}`);

  return ["date,vues", ...lines].join("\n") + "\n";
}
