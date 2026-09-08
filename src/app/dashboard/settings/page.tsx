import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SettingsView } from "@/components/dashboard/settings-view";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

export default function DashboardSettingsPage() {
  return (
    <DashboardShell>
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <SettingsView />
      </main>
    </DashboardShell>
  );
}
