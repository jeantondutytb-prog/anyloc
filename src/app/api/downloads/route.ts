import { getDownloadUrl, DOWNLOAD_ASSETS } from "@/lib/downloads";
import {
  getSubscriptionAccessForUser,
  requireAuthenticatedUser,
} from "@/lib/subscription";

export async function GET() {
  const { user, error } = await requireAuthenticatedUser();

  if (!user) {
    return Response.json({ error }, { status: 401 });
  }

  const access = await getSubscriptionAccessForUser(user.id);

  const assets = DOWNLOAD_ASSETS.map((asset) => ({
    id: asset.id,
    label: asset.label,
    description: asset.description,
    filename: asset.filename,
    available: Boolean(getDownloadUrl(asset.id)),
    downloadPath: `/api/downloads/${asset.id}`,
  }));

  return Response.json({
    hasAccess: access.hasAccess,
    subscriptionStatus: access.status,
    planId: access.planId,
    assets,
  });
}
