import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAppErrorReport } from "./app-error";

describe("parseAppErrorReport", () => {
  it("accepts a well-formed report", () => {
    assert.deepEqual(
      parseAppErrorReport({
        platform: "ios",
        scope: "pairing/save",
        message: "The network connection was lost.",
        app_version: "1.4.0 (52)",
        context: { http_status: 500, retry: true },
      }),
      {
        platform: "ios",
        scope: "pairing/save",
        message: "The network connection was lost.",
        appVersion: "1.4.0 (52)",
        context: { http_status: 500, retry: true },
      }
    );
  });

  it("rejects unknown platforms, odd scopes and empty messages", () => {
    assert.equal(parseAppErrorReport(null), null);
    assert.equal(parseAppErrorReport({ platform: "web", scope: "a", message: "b" }), null);
    assert.equal(parseAppErrorReport({ platform: "ios", scope: "<x>", message: "b" }), null);
    assert.equal(parseAppErrorReport({ platform: "ios", scope: "a", message: "  " }), null);
  });

  it("truncates long fields and drops non-primitive context values", () => {
    const report = parseAppErrorReport({
      platform: "desktop",
      scope: "usb",
      message: "x".repeat(5000),
      context: { nested: { a: 1 }, "bad key": "v", ok: "y".repeat(900), nan: Number.NaN },
    });
    assert.equal(report?.message.length, 2000);
    assert.deepEqual(Object.keys(report?.context ?? {}), ["ok"]);
    assert.equal(String(report?.context.ok).length, 500);
  });
});
