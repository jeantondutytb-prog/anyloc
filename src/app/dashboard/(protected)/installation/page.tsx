import { redirect } from "next/navigation";

type InstallationPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InstallationPage({
  searchParams,
}: InstallationPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      query.set(key, value[0]);
    }
  }

  const suffix = query.toString();
  redirect(suffix ? `/dashboard?${suffix}` : "/dashboard");
}
