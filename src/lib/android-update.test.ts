import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAndroidTag, pickLatestAndroidRelease } from "./android-update";

const apk = (tag: string) => ({
  tag_name: tag,
  assets: [{ name: "Anyloc.apk", browser_download_url: `https://example.test/${tag}/Anyloc.apk` }],
});

describe("parseAndroidTag", () => {
  it("reads the build number as versionCode", () => {
    assert.deepEqual(parseAndroidTag("android-v0.1.53"), { versionCode: 53, versionName: "0.1.53" });
  });

  it("ignores other platforms' tags", () => {
    assert.equal(parseAndroidTag("ios-v1.2.3"), null);
    assert.equal(parseAndroidTag("android-v0.1.53-beta"), null);
  });
});

describe("pickLatestAndroidRelease", () => {
  it("picks the highest build, whatever the list order", () => {
    const latest = pickLatestAndroidRelease([apk("android-v0.1.9"), apk("setup-v3"), apk("android-v0.1.53"), apk("android-v0.1.52")]);
    assert.equal(latest?.versionCode, 53);
    assert.equal(latest?.downloadUrl, "https://example.test/android-v0.1.53/Anyloc.apk");
  });

  it("skips drafts and releases without the APK", () => {
    const latest = pickLatestAndroidRelease([
      { ...apk("android-v0.1.60"), draft: true },
      { tag_name: "android-v0.1.59", assets: [] },
      apk("android-v0.1.54"),
    ]);
    assert.equal(latest?.versionCode, 54);
  });

  it("returns null when there is no Android release", () => {
    assert.equal(pickLatestAndroidRelease([apk("setup-v1")]), null);
  });
});
