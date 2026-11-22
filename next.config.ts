import type { NextConfig } from "next";

// No script/style allowlist on purpose: Stripe, PostHog, Crisp, Clarity and
// the map tiles would each need one, and a miss breaks checkout. These
// directives block framing, plugin content and base/form hijacking only.
const CONTENT_SECURITY_POLICY = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
];

const nextConfig: NextConfig = {
  // Short link for the TikTok carousels, so their visits show up apart from the videos'
  // in PostHog. Temporary (307): the parameters can change later. Runs before
  // src/proxy.ts, so the redirect itself draws no test group and sets no cookie.
  async redirects() {
    return [
      {
        source: "/snap",
        destination: "/?utm_source=tiktok&utm_medium=carrousel",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
