import { createAdminClient } from "@/lib/supabase/admin";
import type { IosBuildRow, IosDeviceRow } from "./build-queue";

const DEVICE_COLUMNS = "id, user_id, status, udid, error, enrollment_expires_at, created_at";
const BUILD_COLUMNS = "id, status, udids, ipa_blob_path, bundle_version, created_at";

export async function getLatestDeviceForUser(userId: string) {
  const { data, error } = await createAdminClient()
    .from("ios_devices")
    .select(DEVICE_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as IosDeviceRow | null) ?? null;
}

export async function getDevice(id: string) {
  const { data, error } = await createAdminClient()
    .from("ios_devices")
    .select(`${DEVICE_COLUMNS}, enrollment_challenge_hash`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as (IosDeviceRow & { enrollment_challenge_hash: string }) | null) ?? null;
}

export async function countRegisteredDevices() {
  const { count, error } = await createAdminClient()
    .from("ios_devices")
    .select("id", { count: "exact", head: true })
    .eq("status", "registered");
  if (error) throw error;
  return count ?? 0;
}

export async function insertEnrollment(input: {
  userId: string;
  challengeHash: string;
  expiresAt: Date;
}) {
  const { data, error } = await createAdminClient()
    .from("ios_devices")
    .insert({
      user_id: input.userId,
      enrollment_challenge_hash: input.challengeHash,
      enrollment_expires_at: input.expiresAt.toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Retourne false si l'UDID est déjà lié à une autre ligne (contrainte unique). */
export async function markDeviceRegistered(
  id: string,
  input: { udid: string; product: string | null; osVersion: string | null; ascDeviceId: string; now: Date }
) {
  const { error } = await createAdminClient()
    .from("ios_devices")
    .update({
      status: "registered",
      udid: input.udid,
      product: input.product,
      os_version: input.osVersion,
      asc_device_id: input.ascDeviceId,
      registered_at: input.now.toISOString(),
      error: null,
    })
    .eq("id", id);
  if (error?.code === "23505") return false;
  if (error) throw error;
  return true;
}

export async function markDeviceFailed(id: string, message: string) {
  const { error } = await createAdminClient()
    .from("ios_devices")
    .update({ status: "failed", error: message })
    .eq("id", id);
  if (error) throw error;
}

export async function listRegisteredUdids() {
  const { data, error } = await createAdminClient()
    .from("ios_devices")
    .select("udid")
    .eq("status", "registered");
  if (error) throw error;
  return (data ?? []).map((row) => row.udid as string).filter(Boolean);
}

async function latestBuild(filterSucceeded: boolean) {
  let query = createAdminClient().from("ios_adhoc_builds").select(BUILD_COLUMNS);
  if (filterSucceeded) query = query.eq("status", "succeeded");
  const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return (data as IosBuildRow | null) ?? null;
}

export const getLatestBuild = () => latestBuild(false);
export const getLatestSucceededBuild = () => latestBuild(true);

export async function getBuild(id: string) {
  const { data, error } = await createAdminClient()
    .from("ios_adhoc_builds")
    .select(BUILD_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as IosBuildRow | null) ?? null;
}

export async function failStaleQueuedBuilds(olderThan: Date) {
  const { error } = await createAdminClient()
    .from("ios_adhoc_builds")
    .update({ status: "failed", error: "Workflow sans réponse (timeout).", finished_at: new Date().toISOString() })
    .eq("status", "queued")
    .lt("created_at", olderThan.toISOString());
  if (error) throw error;
}

/** Retourne null si un build est déjà en file (index unique partiel). */
export async function insertQueuedBuild() {
  const { data, error } = await createAdminClient()
    .from("ios_adhoc_builds")
    .insert({ status: "queued" })
    .select("id")
    .single();
  if (error?.code === "23505") return null;
  if (error) throw error;
  return data.id as string;
}

export async function completeBuild(
  id: string,
  input:
    | { status: "succeeded"; udids: string[]; ipaBlobPath: string; bundleVersion: string }
    | { status: "failed"; error: string }
) {
  const patch =
    input.status === "succeeded"
      ? { status: "succeeded", udids: input.udids, ipa_blob_path: input.ipaBlobPath, bundle_version: input.bundleVersion }
      : { status: "failed", error: input.error };
  const { error } = await createAdminClient()
    .from("ios_adhoc_builds")
    .update({ ...patch, finished_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "queued");
  if (error) throw error;
}
