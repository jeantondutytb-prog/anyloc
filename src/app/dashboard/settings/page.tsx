import { redirect } from "next/navigation";

export default function DashboardSettingsPage() {
  redirect("/dashboard?tab=account");
}
