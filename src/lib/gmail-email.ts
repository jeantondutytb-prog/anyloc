import { normalizeEmail } from "@/lib/guest-account";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

function splitEmail(email: string) {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return null;
  return { local: normalized.slice(0, at), domain: normalized.slice(at + 1) };
}

export function isGmailAddress(email: string) {
  const parts = splitEmail(email);
  return parts !== null && GMAIL_DOMAINS.has(parts.domain);
}

/**
 * The inbox an address really lands in. Gmail ignores dots and any
 * "+suffix" before the @, and googlemail.com is the same as gmail.com:
 * jean.dupont+x@googlemail.com and jeandupont@gmail.com are one mailbox.
 * Other providers are only trimmed and lowercased.
 */
export function canonicalEmail(email: string) {
  const parts = splitEmail(email);
  if (!parts) return normalizeEmail(email);
  if (!GMAIL_DOMAINS.has(parts.domain)) return `${parts.local}@${parts.domain}`;

  const local = parts.local.split("+")[0].replaceAll(".", "");
  return `${local}@gmail.com`;
}

function escapeRegexChar(char: string) {
  return /[a-z0-9]/.test(char) ? char : `\\${char}`;
}

/**
 * Case-insensitive POSIX regex (PostgREST `imatch`) matching every way of
 * writing the same Gmail inbox: dots anywhere, any +suffix, either domain.
 * Returns null for non-Gmail addresses.
 */
export function gmailVariantsPattern(email: string) {
  if (!isGmailAddress(email)) return null;

  const local = canonicalEmail(email).split("@")[0];
  if (!local) return null;

  const body = [...local].map(escapeRegexChar).join("\\.*");
  return `^\\.*${body}\\.*(\\+[^@]*)?@(gmail|googlemail)\\.com$`;
}

/**
 * Finds an existing account whose Gmail address is the same inbox as `email`
 * but written differently (dots, +suffix, googlemail). Exact matches are left
 * to Supabase's own "already registered" handling. Read-only.
 */
export async function findGmailTwinEmail(email: string) {
  const pattern = gmailVariantsPattern(email);
  if (!pattern || !isSupabaseAdminConfigured()) return null;

  const typed = normalizeEmail(email);
  const canonical = canonicalEmail(email);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, created_at")
    .filter("email", "imatch", pattern)
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) {
    console.error("[signup] Gmail twin lookup failed:", error);
    return null;
  }

  const twins = (data ?? [])
    .map((row) => ({
      id: String(row.id),
      email: typeof row.email === "string" ? normalizeEmail(row.email) : "",
    }))
    .filter((row) => row.email && canonicalEmail(row.email) === canonical);

  // The exact address already has an account: Supabase's own flow handles it.
  if (twins.some((row) => row.email === typed)) return null;

  // Only a confirmed account counts: an unconfirmed one may have been opened
  // by someone else with a spelling of this inbox, and must not lock the
  // real owner out of signing up.
  for (const twin of twins) {
    const { data: found } = await admin.auth.admin.getUserById(twin.id);
    if (found.user?.email_confirmed_at) return twin.email;
  }

  return null;
}
