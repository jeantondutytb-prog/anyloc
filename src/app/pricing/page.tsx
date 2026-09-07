import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#050508]">
      <Header />
      <main className="pt-16">
        <Pricing />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
