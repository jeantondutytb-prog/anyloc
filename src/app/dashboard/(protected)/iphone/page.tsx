import { Suspense } from "react";
import { IphoneInstallView } from "@/components/dashboard/iphone-install-view";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

export default function DashboardIphonePage() {
  return (
    <Suspense fallback={null}>
      <IphoneInstallView />
    </Suspense>
  );
}
