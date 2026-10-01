import type { Instrumentation } from "next";

// Every uncaught server error (pages, route handlers, server actions, proxy)
// lands in PostHog error tracking with the route it came from.
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  try {
    const { capturePostHogException } = await import("@/lib/posthog/server");
    const digest =
      typeof error === "object" && error !== null && "digest" in error
        ? String(error.digest)
        : undefined;

    await capturePostHogException({
      distinctId: "server",
      error,
      properties: {
        path: request.path.split("?")[0],
        method: request.method,
        route_path: context.routePath,
        route_type: context.routeType,
        render_source: context.renderSource,
        digest,
      },
    });
  } catch (reportError) {
    console.error("[instrumentation] Failed to report error", reportError);
  }
};
