import { SettingsView } from "@/components/dashboard/settings-view";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

export default function DashboardSettingsPage() {
  return <SettingsView />;
}
