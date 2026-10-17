import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Under the floating header, and its clipper pill on phones. */}
      <main className="pt-[112px] sm:pt-20">{children}</main>
      <Footer />
    </div>
  );
}
