import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-[var(--header-height)]">{children}</main>
      <Footer />
    </div>
  );
}
