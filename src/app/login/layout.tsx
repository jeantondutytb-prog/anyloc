import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

export default function LoginLayout({ children }: LayoutProps<"/login">) {
  return children;
}
