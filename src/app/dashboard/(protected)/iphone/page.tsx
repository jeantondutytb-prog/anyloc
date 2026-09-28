import { redirect } from "next/navigation";

type DashboardIphonePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** L'install iPhone vit désormais sur /dashboard (tuto selon l'abonnement). */
export default async function DashboardIphonePage({
  searchParams,
}: DashboardIphonePageProps) {
  const etape = (await searchParams).etape;
  redirect(typeof etape === "string" ? `/dashboard?etape=${encodeURIComponent(etape)}` : "/dashboard");
}
