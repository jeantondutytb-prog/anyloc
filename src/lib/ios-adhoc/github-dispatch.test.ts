import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { dispatchResignWorkflow } from "./github-dispatch";

describe("dispatchResignWorkflow", () => {
  beforeEach(() => {
    process.env.GITHUB_DISPATCH_TOKEN = "ghp_test";
  });
  afterEach(() => {
    delete process.env.GITHUB_DISPATCH_TOKEN;
  });

  it("posts a workflow_dispatch with the build id", async () => {
    let captured = null as { url: string; init: RequestInit } | null;
    const fakeFetch = (async (url: string, init: RequestInit) => {
      captured = { url, init };
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;

    await dispatchResignWorkflow("build-1", fakeFetch);

    assert.equal(
      captured!.url,
      "https://api.github.com/repos/jeantondutytb-prog/anyloc/actions/workflows/ios-adhoc-resign.yml/dispatches"
    );
    assert.deepEqual(JSON.parse(String(captured!.init.body)), {
      ref: "main",
      inputs: { build_id: "build-1" },
    });
    assert.equal((captured!.init.headers as Record<string, string>).Authorization, "Bearer ghp_test");
  });

  it("throws when GitHub refuses", async () => {
    const fakeFetch = (async () => new Response("nope", { status: 422 })) as unknown as typeof fetch;
    await assert.rejects(dispatchResignWorkflow("b", fakeFetch), /422/);
  });

  it("throws without token", async () => {
    delete process.env.GITHUB_DISPATCH_TOKEN;
    await assert.rejects(dispatchResignWorkflow("b"), /GITHUB_DISPATCH_TOKEN/);
  });
});
