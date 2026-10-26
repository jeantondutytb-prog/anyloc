import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClipperApplicationForm } from "@/components/clippeurs/clipper-application-form";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { SITE } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: `Postuler comme clippeur — ${SITE.name}`,
  description: "3 questions pour rejoindre le programme clippeurs Anyloc.",
  path: "/clippeurs/postuler",
  index: false,
});

/** The application on its own page, with nothing around it but a way back to the programme. */
export default async function ClipperApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ utm_campaign?: string | string[] }>;
}) {
  const { utm_campaign } = await searchParams;
  const utmCampaign = Array.isArray(utm_campaign) ? utm_campaign[0] : utm_campaign;
  const programmeHref = utmCampaign
    ? `/clippeurs?utm_campaign=${encodeURIComponent(utmCampaign)}`
    : "/clippeurs";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 px-2 pt-2 sm:px-4 sm:pt-3">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 rounded-full border border-zinc-200/80 bg-white/85 pl-3 pr-4 shadow-lg shadow-zinc-900/5 backdrop-blur-md sm:pl-4">
          <Logo />
          <Link
            href={programmeHref}
            className="flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Le programme
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-14">
        <p className="text-xs font-bold uppercase tracking-widest text-pink-600">Ta candidature</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Deviens clippeur Anyloc
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Anyloc gratuit · 0,50 € les 1 000 vues · payé chaque semaine
        </p>
        <Card className="mt-6 p-5 sm:p-7">
          <ClipperApplicationForm utmCampaign={utmCampaign} />
        </Card>
        <p className="mt-4 text-center text-xs text-zinc-500">3 questions · 20 secondes</p>
      </main>
    </div>
  );
}
