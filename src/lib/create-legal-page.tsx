import { MarketingShell } from "@/components/layout/marketing-shell";
import { LegalPageContent } from "@/components/layout/legal-page-content";
import { SITE } from "@/lib/constants";
import { getLegalPageContent } from "@/lib/legal-content";
import { createPageMetadata } from "@/lib/seo";

export function createLegalPageMetadata(slug: string) {
  const content = getLegalPageContent(slug);
  if (!content) {
    throw new Error(`Unknown legal page slug: ${slug}`);
  }

  return createPageMetadata({
    title: `${content.title} — ${SITE.name}`,
    description: content.description,
    path: content.path,
  });
}

export function LegalPage({ slug }: { slug: string }) {
  const content = getLegalPageContent(slug);
  if (!content) {
    return null;
  }

  return (
    <MarketingShell>
      <LegalPageContent content={content} />
    </MarketingShell>
  );
}
