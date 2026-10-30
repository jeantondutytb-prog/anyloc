import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDesktopInstallEmail, planNeedsDesktopInstall } from "./desktop-install-email";

describe("planNeedsDesktopInstall", () => {
  it("sends monthly buyers to the computer install", () => {
    assert.equal(planNeedsDesktopInstall("monthly"), true);
    assert.equal(planNeedsDesktopInstall("month_v2"), true);
    assert.equal(planNeedsDesktopInstall(null), true);
  });

  it("skips plans that include the iPhone app", () => {
    assert.equal(planNeedsDesktopInstall("annual"), false);
    assert.equal(planNeedsDesktopInstall("year_v2"), false);
  });
});

describe("buildDesktopInstallEmail", () => {
  it("links to the dashboard with the source in the campaign", () => {
    const email = buildDesktopInstallEmail({
      appUrl: "https://anyloc.io",
      source: "dashboard_button",
    });

    const url =
      "https://anyloc.io/dashboard?utm_source=email&utm_medium=email&utm_campaign=desktop_install_dashboard_button";
    assert.ok(email.text.includes(url));
    assert.ok(email.html.includes(url.replace(/&/g, "&amp;")));
  });

  it("thanks the buyer only in the after-purchase email", () => {
    const appUrl = "https://anyloc.io";
    assert.ok(buildDesktopInstallEmail({ appUrl, source: "after_purchase" }).text.includes("merci pour ton achat"));
    assert.ok(!buildDesktopInstallEmail({ appUrl, source: "dashboard_button" }).text.includes("merci pour ton achat"));
  });
});
