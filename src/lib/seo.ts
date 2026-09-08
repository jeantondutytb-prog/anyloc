import type { Metadata } from "next";
import { SITE } from "@/lib/constants";

export const SITE_URL = `https://www.${SITE.domain}`;

export const SEO_KEYWORDS = [
  "anyloc",
  "Anyloc",
  "fake GPS",
  "GPS spoof",
  "localisation fictive",
  "changer localisation iPhone",
  "changer localisation Android",
  "Snapchat localisation",
  "Tinder localisation",
  "Instagram localisation",
];

export const PUBLIC_ROUTES = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/pricing", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/setup/ios", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/setup/android", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/web", changeFrequency: "monthly" as const, priority: 0.8 },
];

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function createPageMetadata({
  title,
  description,
  path,
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
}): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    keywords: SEO_KEYWORDS,
    alternates: {
      canonical: url,
    },
    robots: index
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        }
      : {
          index: false,
          follow: false,
        },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      locale: "fr_FR",
      type: "website",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: SITE.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
    },
  };
}

export const rootMetadata: Metadata = createPageMetadata({
  title: `${SITE.name} — Fake ta loc sur toutes tes apps`,
  description: SITE.description,
  path: "/",
});

export const noIndexMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};
