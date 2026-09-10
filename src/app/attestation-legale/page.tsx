import {
  createLegalPageMetadata,
  LegalPage,
} from "@/lib/create-legal-page";

export const metadata = createLegalPageMetadata("attestation-legale");

export default function AttestationLegalePage() {
  return <LegalPage slug="attestation-legale" />;
}
