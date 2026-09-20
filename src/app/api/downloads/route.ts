import { DOWNLOAD_ASSETS, isDownloadAvailable } from "@/lib/downloads";
import { userNeedsSetupPassword } from "@/lib/setup-password";
import {
  getSubscriptionAccessForUser,
  requireAuthenticatedUser,
} from "@/lib/subscription";

export async function GET() {
  const { user, error } = await requireAuthenticatedUser();

  if (!user) {
    return Response.json({ error }, { status: 401 });
  }

  const access = await getSubscriptionAccessForUser(user.id, user.email);

  const assets = await Promise.all(
    DOWNLOAD_ASSETS.map(async (asset) => ({
      id: asset.id,
      label: asset.label,
      description: asset.description,
      filename: asset.filename,
      available: await isDownloadAvailable(asset.id),
      downloadPath: `/api/downloads/${asset.id}?v=${encodeURIComponent(asset.filename)}`,
      hidden: Boolean(asset.hidden),
    }))
  );

  return Response.json({
    hasAccess: access.hasAccess,
    subscriptionStatus: access.status,
    planId: access.planId,
    isAdmin: access.isAdmin,
    needsSetupPassword: userNeedsSetupPassword(user),
    assets,
  });
}
