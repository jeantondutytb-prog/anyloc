import {
  createLegalPageMetadata,
  LegalPage,
} from "@/lib/create-legal-page";

export const metadata = createLegalPageMetadata("politique-de-confidentialite");

export default function PolitiqueDeConfidentialitePage() {
  return <LegalPage slug="politique-de-confidentialite" />;
}
