import {
  StaticPage,
  StaticSection,
  StaticList,
} from "@/components/layout/static-page";
import { PendingValue } from "@/components/ui/pending-info";
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
          {section.fields?.map((field) => (
            <p key={field.label}>
              <span className="font-medium text-zinc-700">{field.label} :</span>{" "}
              {field.pending ? <PendingValue /> : field.value}
            </p>
          ))}
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.list ? <StaticList items={section.list} /> : null}
        </StaticSection>
      ))}
    </StaticPage>
  );
}
