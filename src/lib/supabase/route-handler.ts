import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export function createCookieCollector() {
  const cookiesToSet: CookieToSet[] = [];
  const headerPairs: Array<[string, string]> = [];

  return {
    push(cookies: CookieToSet[], headers?: Record<string, string>) {
      cookiesToSet.push(...cookies);
      if (headers) {
        headerPairs.push(...Object.entries(headers));
      }
    },
    applyTo(response: NextResponse) {
      for (const { name, value, options } of cookiesToSet) {
        response.cookies.set(name, value, options);
      }
      for (const [key, value] of headerPairs) {
        response.headers.set(key, value);
      }
      return response;
    },
  };
}

export function createRouteHandlerClient(
  request: NextRequest,
  collector: ReturnType<typeof createCookieCollector>
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          collector.push(cookiesToSet, headers);
        },
      },
    }
  );
}
