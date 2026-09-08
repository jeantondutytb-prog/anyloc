import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return children;
}
