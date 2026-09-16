import { notFound } from "next/navigation";
import { CancelSubscriptionPreview } from "./preview-client";

export default function CancelSubscriptionPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <CancelSubscriptionPreview />;
}
