import {
  StaticPage,
  StaticSection,
  StaticList,
} from "@/components/layout/static-page";
import type { LegalPageContent } from "@/lib/legal-content";

export function LegalPageContent({ content }: { content: LegalPageContent }) {
  return (
    <StaticPage
      title={content.title}
      description={content.description}
      lastUpdated={content.lastUpdated}
    >
      {content.sections.map((section) => (
        <StaticSection key={section.title} title={section.title}>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.list ? <StaticList items={section.list} /> : null}
        </StaticSection>
      ))}
    </StaticPage>
  );
}
