import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

export default function ResetPasswordLayout({ children }: LayoutProps<"/reset-password">) {
  return children;
}
