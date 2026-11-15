import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { desktopInstallDistinctId, parseAppEventReport } from "./app-event";

const INSTALL_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("parseAppEventReport", () => {
  it("accepts a known event and keeps only flat properties", () => {
    assert.deepEqual(
      parseAppEventReport({
        event: "desktop_guide_step_viewed",
        install_id: INSTALL_ID.toUpperCase(),
        app_version: "2.3.0",
        properties: {
          step: "devmode",
          step_index: 2,
          app_eligible: false,
          nested: { no: true },
          "bad key": "x",
        },
      }),
      {
        event: "desktop_guide_step_viewed",
        installId: INSTALL_ID,
        appVersion: "2.3.0",
        properties: { step: "devmode", step_index: 2, app_eligible: false },
      }
    );
  });

  it("rejects unknown events and malformed install ids", () => {
    assert.equal(parseAppEventReport(null), null);
    assert.equal(parseAppEventReport({ event: "purchase_completed", install_id: INSTALL_ID }), null);
    assert.equal(parseAppEventReport({ event: "desktop_app_opened", install_id: "abc" }), null);
    assert.equal(parseAppEventReport({ event: "desktop_app_opened" }), null);
  });
});

describe("desktopInstallDistinctId", () => {
  it("namespaces the install id", () => {
    assert.equal(desktopInstallDistinctId(INSTALL_ID), `desktop:${INSTALL_ID}`);
  });
});
