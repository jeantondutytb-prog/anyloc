import { redirect } from "next/navigation";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/subscription";

type DailyCounts = Record<
  string,
  { checkout_page_viewed: number; checkout_started: number; purchase_completed: number }
>;

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

async function getDailyFunnelCounts(): Promise<DailyCounts> {
  if (!isSupabaseAdminConfigured()) {
    return {};
  }

  const admin = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data, error } = await admin
    .from("funnel_events")
    .select("event, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (error || !data) {
    return {};
  }

  const counts: DailyCounts = {};

  for (const row of data) {
    const day = dayKey(row.created_at as string);
    counts[day] ??= {
      checkout_page_viewed: 0,
      checkout_started: 0,
      purchase_completed: 0,
    };

    if (row.event in counts[day]) {
      counts[day][row.event as keyof DailyCounts[string]] += 1;
    }
  }

  return counts;
}

export default async function AdminFunnelPage() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/");
  }

  const counts = await getDailyFunnelCounts();
  const days = Object.keys(counts).sort((a, b) => (a < b ? 1 : -1));

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Funnel (30 derniers jours)</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Vues checkout → sessions Stripe créées → achats confirmés.
      </p>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 pr-4">Jour</th>
            <th className="py-2 pr-4">Vues checkout</th>
            <th className="py-2 pr-4">Sessions Stripe</th>
            <th className="py-2 pr-4">Achats</th>
          </tr>
        </thead>
        <tbody>
          {days.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-neutral-500">
                Aucune donnée pour l&apos;instant.
              </td>
            </tr>
          )}
          {days.map((day) => (
            <tr key={day} className="border-b">
              <td className="py-2 pr-4">{day}</td>
              <td className="py-2 pr-4">{counts[day].checkout_page_viewed}</td>
              <td className="py-2 pr-4">{counts[day].checkout_started}</td>
              <td className="py-2 pr-4">{counts[day].purchase_completed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
