const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://client.crisp.chat",
  "style-src 'self' 'unsafe-inline' https://client.crisp.chat",
  "img-src 'self' data: blob: https: http:",
  "font-src 'self' data: https://client.crisp.chat",
  [
    "connect-src 'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://api.stripe.com",
    "https://*.stripe.com",
    "https://client.crisp.chat",
    "wss://client.relay.crisp.chat",
    "wss://*.crisp.chat",
    "https://nominatim.openstreetmap.org",
    "https://photon.komoot.io",
    "https://*.tile.openstreetmap.org",
    "https://api.github.com",
  ].join(" "),
  "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://client.crisp.chat",
].join("; ");

export const SECURITY_HEADERS = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];
