import {
  createLegalPageMetadata,
  LegalPage,
} from "@/lib/create-legal-page";

export const metadata = createLegalPageMetadata("politique-d-annulation");

export default function PolitiqueDAnnulationPage() {
  return <LegalPage slug="politique-d-annulation" />;
}
