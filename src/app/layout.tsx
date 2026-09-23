import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AmplitudeProvider } from "@/components/amplitude/amplitude-provider";
import { ClarityTag } from "@/components/clarity/clarity-tag";
import { CrispChat } from "@/components/crisp/crisp-chat";
import { PostHogProvider } from "@/components/posthog/posthog-provider";
import { ScrollToTop } from "@/components/scroll-to-top";
import { rootMetadata, SITE_URL } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  ...rootMetadata,
  metadataBase: new URL(SITE_URL),
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-zinc-900">
        <ScrollToTop />
        <PostHogProvider />
        <AmplitudeProvider />
        <ClarityTag />
        {children}
        <CrispChat />
      </body>
    </html>
  );
}
