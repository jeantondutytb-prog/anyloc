import {
  createLegalPageMetadata,
  LegalPage,
} from "@/lib/create-legal-page";

export const metadata = createLegalPageMetadata("conditions-generales");

export default function ConditionsGeneralesPage() {
  return <LegalPage slug="conditions-generales" />;
}
