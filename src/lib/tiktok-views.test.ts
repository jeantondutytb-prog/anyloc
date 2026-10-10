import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDailyViewsCsv,
  computeViewsSince,
  parisDate,
  type PreviousSnapshot,
  type VideoCount,
} from "./tiktok-views";

const takenAt = new Date("2026-10-10T21:00:00Z");

function video(videoId: string, playCount: number, createdAt: string | null = null): VideoCount {
  return {
    account: "emma.ftpl",
    videoId,
    playCount,
    createdAt: createdAt ? new Date(createdAt) : null,
  };
}

function previous(counts: Record<string, number>): PreviousSnapshot {
  return { takenAt, playCounts: new Map(Object.entries(counts)) };
}

describe("computeViewsSince", () => {
  it("adds the growth of videos seen in both snapshots", () => {
    const views = computeViewsSince(
      [video("a", 1500), video("b", 320)],
      previous({ a: 1000, b: 300 })
    );
    assert.equal(views, 520);
  });

  it("counts a video posted after the previous snapshot in full", () => {
    const views = computeViewsSince(
      [video("new", 4200, "2026-10-11T08:00:00Z"), video("a", 1100)],
      previous({ a: 1000 })
    );
    assert.equal(views, 4300);
  });

  it("ignores an older video that was not tracked before", () => {
    const views = computeViewsSince(
      [video("old", 90000, "2026-09-01T08:00:00Z")],
      previous({})
    );
    assert.equal(views, 0);
  });

  it("never lets a lowered count subtract views", () => {
    assert.equal(computeViewsSince([video("a", 900)], previous({ a: 1000 })), 0);
  });
});

describe("parisDate", () => {
  it("files a late-evening UTC run under the Paris day", () => {
    assert.equal(parisDate(new Date("2026-10-10T22:30:00Z")), "2026-10-11");
    assert.equal(parisDate(new Date("2026-10-10T21:30:00Z")), "2026-10-10");
  });
});

describe("buildDailyViewsCsv", () => {
  it("sums the accounts per day, oldest first", () => {
    const csv = buildDailyViewsCsv([
      { day: "2026-10-12", views: 10 },
      { day: "2026-10-11", views: 5 },
      { day: "2026-10-11", views: 7 },
    ]);
    assert.equal(csv, "date,vues\n2026-10-11,12\n2026-10-12,10\n");
  });
});
