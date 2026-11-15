import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

export default function ForgotPasswordLayout({ children }: LayoutProps<"/forgot-password">) {
  return children;
}
