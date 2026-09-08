import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

export default function CheckoutLayout({ children }: LayoutProps<"/checkout">) {
  return children;
}
