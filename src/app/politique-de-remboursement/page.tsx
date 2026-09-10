import {
  createLegalPageMetadata,
  LegalPage,
} from "@/lib/create-legal-page";

export const metadata = createLegalPageMetadata("politique-de-remboursement");

export default function PolitiqueDeRemboursementPage() {
  return <LegalPage slug="politique-de-remboursement" />;
}
