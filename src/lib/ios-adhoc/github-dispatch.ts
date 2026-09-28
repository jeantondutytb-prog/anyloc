const WORKFLOW_URL =
  "https://api.github.com/repos/jeantondutytb-prog/anyloc/actions/workflows/ios-adhoc-resign.yml/dispatches";

export async function dispatchResignWorkflow(buildId: string, fetchImpl: typeof fetch = fetch) {
  const token = process.env.GITHUB_DISPATCH_TOKEN?.trim();

  if (!token) {
    throw new Error("GITHUB_DISPATCH_TOKEN manquant.");
  }

  const response = await fetchImpl(WORKFLOW_URL, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "anyloc-ios-adhoc",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      ref: process.env.IOS_ADHOC_WORKFLOW_REF?.trim() || "main",
      inputs: { build_id: buildId },
    }),
  });

  if (response.status !== 204) {
    throw new Error(`GitHub dispatch refusé : HTTP ${response.status}`);
  }
}
