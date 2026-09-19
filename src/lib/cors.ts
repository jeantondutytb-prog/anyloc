export const OPEN_GET_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization",
  "Access-Control-Max-Age": "86400",
} as const;

export function jsonWithCors(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(OPEN_GET_CORS_HEADERS)) {
    headers.set(key, value);
  }

  return Response.json(body, { ...init, headers });
}

export function corsPreflightResponse() {
  return new Response(null, {
    status: 204,
    headers: OPEN_GET_CORS_HEADERS,
  });
}
