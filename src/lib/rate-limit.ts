import { NextResponse, type NextRequest } from "next/server";

type RateLimitRule = {
  prefix: string;
  namespace: string;
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const globalStore = globalThis as typeof globalThis & {
  __anylocRateLimit?: Map<string, Bucket>;
};

export const API_RATE_LIMIT_RULES: RateLimitRule[] = [
  { prefix: "/api/geocode", namespace: "geocode", limit: 30, windowMs: 60_000 },
  { prefix: "/api/checkout", namespace: "checkout", limit: 10, windowMs: 60_000 },
  {
    prefix: "/api/stripe/embedded-checkout",
    namespace: "checkout-embedded",
    limit: 10,
    windowMs: 60_000,
  },
  {
    prefix: "/api/device/location",
    namespace: "device-location",
    limit: 120,
    windowMs: 60_000,
  },
  {
    prefix: "/api/device/pairing",
    namespace: "device-pairing",
    limit: 20,
    windowMs: 60_000,
  },
];

function getStore() {
  if (!globalStore.__anylocRateLimit) {
    globalStore.__anylocRateLimit = new Map();
  }

  return globalStore.__anylocRateLimit;
}

function pruneStore() {
  const store = getStore();
  const now = Date.now();

  for (const [key, bucket] of store.entries()) {
    if (now >= bucket.resetAt) {
      store.delete(key);
    }
  }
}

export function getClientIp(request: NextRequest | Request) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function getRateLimitKey(request: NextRequest, namespace: string) {
  const ip = getClientIp(request);
  const authorization = request.headers.get("authorization")?.trim();

  if (authorization) {
    return `${namespace}:${ip}:${authorization.slice(0, 48)}`;
  }

  return `${namespace}:${ip}`;
}

function checkRateLimit(key: string, limit: number, windowMs: number) {
  const store = getStore();
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true as const };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false as const,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true as const };
}

function findRateLimitRule(pathname: string) {
  return API_RATE_LIMIT_RULES.find(
    (rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)
  );
}

export function enforceApiRateLimit(request: NextRequest) {
  const rule = findRateLimitRule(request.nextUrl.pathname);

  if (!rule) {
    return null;
  }

  if (Math.random() < 0.01) {
    pruneStore();
  }

  const key = getRateLimitKey(request, rule.namespace);
  const result = checkRateLimit(key, rule.limit, rule.windowMs);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessaie dans quelques instants." },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfter ?? 60),
        },
      }
    );
  }

  return null;
}
