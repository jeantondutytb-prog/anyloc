import { InstallationGuideView } from "@/components/dashboard/installation-guide-view";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

export default function InstallationPage() {
  return <InstallationGuideView />;
}
