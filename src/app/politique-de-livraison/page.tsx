import {
  createLegalPageMetadata,
  LegalPage,
} from "@/lib/create-legal-page";

export const metadata = createLegalPageMetadata("politique-de-livraison");

export default function PolitiqueDeLivraisonPage() {
  return <LegalPage slug="politique-de-livraison" />;
}
