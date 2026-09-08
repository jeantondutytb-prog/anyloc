import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

export default function RegisterLayout({ children }: LayoutProps<"/register">) {
  return children;
}
