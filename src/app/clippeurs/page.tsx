import Link from "next/link";
import { ArrowRight, Banknote, CalendarCheck, Gift, Rocket, Send, Smartphone, Sparkles } from "lucide-react";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { SITE } from "@/lib/constants";
import { createPageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const metadata = createPageMetadata({
  title: `Deviens clippeur — ${SITE.name}`,
  description:
    "Poste des vidéos courtes sur Anyloc, profite de l'accès gratuit et gagne de l'argent avec tes clips.",
  path: "/clippeurs",
  index: false,
});

const PERKS = [
  {
    icon: Gift,
    title: "Anyloc gratuit",
    body: "On t'ouvre l'accès complet, sans payer.",
  },
  {
    icon: Rocket,
    title: "Pas besoin d'abonnés",
    body: "Ça marche même avec un compte TikTok tout neuf.",
  },
  {
    icon: Banknote,
    title: "0,50 € les 1 000 vues",
    body: "Payé chaque semaine, au prorata de tes vues.",
  },
];

const STEPS = [
  {
    icon: Send,
    title: "Tu postules",
    body: "3 questions, puis tu nous envoies un message sur WhatsApp.",
  },
  {
    icon: Sparkles,
    title: "On te lance",
    body: "On t'ouvre Anyloc et on t'envoie les hooks et les formats qui marchent chez nous.",
  },
  {
    icon: Smartphone,
    title: "Tu postes tes clips",
    body: "Des vidéos courtes sur Anyloc, sur ton TikTok ou ton Insta.",
  },
  {
    icon: CalendarCheck,
    title: "On te paye chaque semaine",
    body: "On compte les vues de la semaine et on te verse ce que tu as gagné.",
  },
];

// 0,50 € per 1 000 views; the bonus only starts at 100 000 views on a video.
const EARNINGS = [
  { views: "10 000", base: "5 €", bonus: null, total: "5 €" },
  { views: "100 000", base: "50 €", bonus: "10 €", total: "60 €" },
  { views: "500 000", base: "250 €", bonus: "50 €", total: "300 €" },
];

const RULES = [
  "Une vidéo est payée dès qu'elle dépasse 1 000 vues.",
  "On peut te demander une capture des stats TikTok d'une vidéo.",
  "Les vues achetées ou venant de l'étranger ne sont pas payées.",
  "Les 2 premières semaines, c'est plafonné à 100 € par semaine. Ensuite, on enlève le plafond pour ceux qui performent.",
];

function ApplyButton({ href, location, className }: { href: string; location: string; className?: string }) {
  return (
    <Link
      href={href}
      data-track="clipper_apply_clicked"
      data-track-location={location}
      className={cn(
        "btn-gradient flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold text-white transition hover:opacity-90 sm:w-auto sm:px-8",
        className
      )}
    >
      Postuler en 20 secondes
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function SectionKicker({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold uppercase tracking-widest text-pink-600">{children}</p>;
}

export default async function ClippeursPage({
  searchParams,
}: {
  searchParams: Promise<{ utm_campaign?: string | string[] }>;
}) {
  const { utm_campaign } = await searchParams;
  const utmCampaign = Array.isArray(utm_campaign) ? utm_campaign[0] : utm_campaign;
  // The questions live on their own page; the campaign follows the visitor there.
  const applyHref = utmCampaign
    ? `/clippeurs/postuler?utm_campaign=${encodeURIComponent(utmCampaign)}`
    : "/clippeurs/postuler";

  return (
    <MarketingShell>
      <section className="py-10 sm:py-16">
        <div className="mx-auto max-w-lg px-4 sm:px-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700">
            <Sparkles className="h-3.5 w-3.5" />
            Programme clippeurs
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Poste des clips sur Anyloc. <span className="gradient-text">Gagne de l&apos;argent.</span>
          </h1>
          <p className="mt-3 text-base text-zinc-600">
            Tu postes des vidéos courtes sur Anyloc, tu as l&apos;appli gratuitement, et tu touches{" "}
            <strong className="text-zinc-900">0,50 € pour chaque tranche de 1 000 vues</strong>.
          </p>
          <ApplyButton href={applyHref} location="hero" className="mt-5" />

          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {PERKS.map((perk) => (
              <li key={perk.title} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50">
                  <perk.icon className="h-4.5 w-4.5 text-pink-600" />
                </span>
                <p className="mt-3 text-sm font-semibold text-zinc-900">{perk.title}</p>
                <p className="mt-1 text-[13px] leading-snug text-zinc-600">{perk.body}</p>
              </li>
            ))}
          </ul>

          <div className="mt-12">
            <SectionKicker>Comment ça marche</SectionKicker>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-zinc-900">4 étapes, rien de compliqué</h2>
            <ol className="mt-5 space-y-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 text-xs font-bold text-white">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{step.title}</p>
                    <p className="mt-0.5 text-[13px] leading-snug text-zinc-600">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-12 rounded-3xl border border-pink-100 bg-gradient-to-br from-pink-50 via-white to-violet-50 p-5 sm:p-6">
            <SectionKicker>Ce que tu touches</SectionKicker>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-zinc-900">
              0,50 € les 1 000 vues, <span className="gradient-text">plus un bonus</span> dès 100 000 vues
            </h2>
            <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="grid grid-cols-[1.2fr_1fr_1fr] bg-zinc-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                <span>Vues sur 1 vidéo</span>
                <span className="text-right">Bonus</span>
                <span className="text-right">Tu touches</span>
              </div>
              {EARNINGS.map((row) => (
                <div
                  key={row.views}
                  className="grid grid-cols-[1.2fr_1fr_1fr] items-center border-t border-zinc-100 px-4 py-3 text-sm"
                >
                  <span className="font-medium text-zinc-900">{row.views}</span>
                  <span className="text-right text-zinc-500">{row.bonus ? `+ ${row.bonus}` : "—"}</span>
                  <span className="text-right font-bold text-zinc-900">{row.total}</span>
                </div>
              ))}
            </div>
            <ul className="mt-5 space-y-2">
              {RULES.map((rule) => (
                <li key={rule} className="flex gap-2 text-[13px] leading-snug text-zinc-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-400" />
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12 text-center">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">Prêt à te lancer ?</h2>
            <p className="mt-1 text-sm text-zinc-600">3 questions · 20 secondes, puis on se parle sur WhatsApp.</p>
            <ApplyButton href={applyHref} location="bottom" className="mt-5 sm:mx-auto sm:w-fit" />
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
