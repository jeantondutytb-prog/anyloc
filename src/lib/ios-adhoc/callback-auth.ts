import { timingSafeEqual } from "node:crypto";

/** GitHub workflows call back with `Authorization: Bearer $IOS_BUILD_CALLBACK_SECRET`. */
export function isBuildCallbackAuthorized(request: Request) {
  const secret = process.env.IOS_BUILD_CALLBACK_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
