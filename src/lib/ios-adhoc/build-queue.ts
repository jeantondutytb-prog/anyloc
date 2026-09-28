import {
  IOS_ADHOC_BUILD_STALE_MS,
  IOS_ADHOC_FAILED_BUILD_BACKOFF_MS,
} from "./config";

export type IosDeviceRow = {
  id: string;
  user_id: string;
  status: "awaiting_udid" | "registered" | "failed";
  udid: string | null;
  error: string | null;
  enrollment_expires_at: string;
  created_at: string;
};

export type IosBuildRow = {
  id: string;
  status: "queued" | "succeeded" | "failed";
  udids: string[];
  ipa_blob_path: string | null;
  bundle_version: string | null;
  created_at: string;
};

export type IosInstallState =
  | { kind: "not_started" }
  | { kind: "awaiting_udid" }
  | { kind: "preparing" }
  | { kind: "ready"; buildId: string }
  | { kind: "failed"; message: string };

const DEFAULT_FAILURE =
  "On n'a pas pu enregistrer ton iPhone. Réessaie, ou écris-nous sur le chat.";

export function getIosInstallState(input: {
  device: IosDeviceRow | null;
  latestSucceededBuild: IosBuildRow | null;
  now: number;
}): IosInstallState {
  const { device, latestSucceededBuild, now } = input;

  if (!device) {
    return { kind: "not_started" };
  }

  if (device.status === "failed") {
    return { kind: "failed", message: device.error ?? DEFAULT_FAILURE };
  }

  if (device.status === "awaiting_udid") {
    return Date.parse(device.enrollment_expires_at) <= now
      ? { kind: "not_started" }
      : { kind: "awaiting_udid" };
  }

  if (device.udid && latestSucceededBuild?.udids.includes(device.udid)) {
    return { kind: "ready", buildId: latestSucceededBuild.id };
  }

  return { kind: "preparing" };
}

export function isBuildStale(build: IosBuildRow, now: number) {
  return build.status === "queued" && now - Date.parse(build.created_at) > IOS_ADHOC_BUILD_STALE_MS;
}

export function needsNewBuild(input: {
  registeredUdids: string[];
  latestBuild: IosBuildRow | null;
  latestSucceededBuild: IosBuildRow | null;
  now: number;
}) {
  const signed = new Set(input.latestSucceededBuild?.udids ?? []);
  const hasPending = input.registeredUdids.some((udid) => !signed.has(udid));

  if (!hasPending) {
    return false;
  }

  const latest = input.latestBuild;

  if (!latest) {
    return true;
  }

  const age = input.now - Date.parse(latest.created_at);

  if (latest.status === "queued") {
    return isBuildStale(latest, input.now);
  }

  if (latest.status === "failed") {
    return age > IOS_ADHOC_FAILED_BUILD_BACKOFF_MS;
  }

  return true;
}
