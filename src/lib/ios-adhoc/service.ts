import { timingSafeEqual } from "node:crypto";
import { ascCredentialsFromEnv, createAscClient } from "./app-store-connect";
import { getIosInstallState, needsNewBuild, type IosInstallState } from "./build-queue";
import {
  IOS_ADHOC_ACCOUNT_DEVICE_LIMIT,
  IOS_ADHOC_BUILD_STALE_MS,
  IOS_ADHOC_ENROLLMENT_TTL_MS,
} from "./config";
import { dispatchResignWorkflow } from "./github-dispatch";
import { createEnrollmentChallenge, hashChallenge, type DeviceAttributes } from "./mobileconfig";
import * as store from "./store";

const ALREADY_LINKED =
  "Cet iPhone est déjà lié à un autre compte Anyloc. Écris-nous sur le chat pour le transférer.";

export async function startIosEnrollment(userId: string, now: Date) {
  const existing = await store.getLatestDeviceForUser(userId);

  if (existing?.status === "registered") {
    return { kind: "already_registered" as const };
  }

  if ((await store.countRegisteredDevices()) >= IOS_ADHOC_ACCOUNT_DEVICE_LIMIT) {
    return { kind: "quota_full" as const };
  }

  const { challenge, hash } = createEnrollmentChallenge();
  const enrollmentId = await store.insertEnrollment({
    userId,
    challengeHash: hash,
    expiresAt: new Date(now.getTime() + IOS_ADHOC_ENROLLMENT_TTL_MS),
  });

  return { kind: "created" as const, enrollmentId, challenge };
}

function sameHash(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function completeIosEnrollment(
  enrollmentId: string,
  attrs: DeviceAttributes,
  now: Date
) {
  const device = await store.getDevice(enrollmentId);

  if (
    !device ||
    device.status !== "awaiting_udid" ||
    Date.parse(device.enrollment_expires_at) <= now.getTime() ||
    !sameHash(hashChallenge(attrs.challenge), device.enrollment_challenge_hash)
  ) {
    return { ok: false };
  }

  let ascDeviceId: string;
  try {
    const asc = createAscClient(ascCredentialsFromEnv());
    ascDeviceId = await asc.registerDevice(attrs.udid, `Anyloc ${device.user_id.slice(0, 8)}`);
  } catch (error) {
    console.error("[ios-adhoc] ASC registerDevice failed:", error);
    await store.markDeviceFailed(enrollmentId, "Apple n'a pas accepté l'enregistrement de ton iPhone. Réessaie dans quelques minutes.");
    return { ok: false };
  }

  const saved = await store.markDeviceRegistered(enrollmentId, {
    udid: attrs.udid,
    product: attrs.product,
    osVersion: attrs.osVersion,
    ascDeviceId,
    now,
  });

  if (!saved) {
    await store.markDeviceFailed(enrollmentId, ALREADY_LINKED);
    return { ok: false };
  }

  await ensureBuildForPendingDevices(now);
  return { ok: true };
}

const UDID_RE = /^[0-9A-Fa-f-]{24,40}$/;

/**
 * Anyloc Setup lit l'UDID directement en USB : pas besoin du profil
 * .mobileconfig, on enregistre l'iPhone en un appel.
 */
export async function registerIosDeviceFromDesktop(
  userId: string,
  input: { udid: string; product: string | null; osVersion: string | null },
  now: Date
) {
  if (!UDID_RE.test(input.udid)) {
    return { ok: false as const, message: "iPhone non reconnu. Rebranche-le et réessaie." };
  }

  const existing = await store.getLatestDeviceForUser(userId);
  if (existing?.status === "registered") {
    if (existing.udid?.toLowerCase() === input.udid.toLowerCase()) {
      await ensureBuildForPendingDevices(now);
      return { ok: true as const };
    }
    return {
      ok: false as const,
      message: "Ton compte est déjà lié à un autre iPhone. Écris-nous sur le chat pour changer d'iPhone.",
    };
  }

  const started = await startIosEnrollment(userId, now);
  if (started.kind === "quota_full") {
    return {
      ok: false as const,
      message: "Les places iPhone sont pleines pour le moment. Écris-nous sur le chat, on te réserve la prochaine.",
    };
  }
  if (started.kind === "already_registered") {
    return { ok: true as const };
  }

  const done = await completeIosEnrollment(
    started.enrollmentId,
    { ...input, challenge: started.challenge },
    now
  );
  if (done.ok) return { ok: true as const };

  const device = await store.getDevice(started.enrollmentId);
  return {
    ok: false as const,
    message: device?.error ?? "On n'a pas pu enregistrer ton iPhone. Réessaie, ou écris-nous sur le chat.",
  };
}

export async function ensureBuildForPendingDevices(now: Date) {
  const [registeredUdids, latestBuild, latestSucceededBuild] = await Promise.all([
    store.listRegisteredUdids(),
    store.getLatestBuild(),
    store.getLatestSucceededBuild(),
  ]);

  if (!needsNewBuild({ registeredUdids, latestBuild, latestSucceededBuild, now: now.getTime() })) {
    return;
  }

  await queueBuild(now);
}

/** Re-signs the current base app for every registered iPhone. */
export async function queueBuild(now: Date) {
  await store.failStaleQueuedBuilds(new Date(now.getTime() - IOS_ADHOC_BUILD_STALE_MS));
  const buildId = await store.insertQueuedBuild();

  if (!buildId) {
    return;
  }

  try {
    await dispatchResignWorkflow(buildId);
  } catch (error) {
    console.error("[ios-adhoc] dispatch failed:", error);
    await store.completeBuild(buildId, { status: "failed", error: "Déclenchement GitHub impossible." });
  }
}

export async function getIosStatusForUser(userId: string, now: Date): Promise<IosInstallState> {
  const device = await store.getLatestDeviceForUser(userId);

  if (device?.status === "registered") {
    await ensureBuildForPendingDevices(now);
  }

  const [latestSucceededBuild, latestBuild] = await Promise.all([
    store.getLatestSucceededBuild(),
    store.getLatestBuild(),
  ]);
  return getIosInstallState({ device, latestSucceededBuild, latestBuild, now: now.getTime() });
}
