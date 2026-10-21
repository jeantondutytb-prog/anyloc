import { createHmac, timingSafeEqual } from "node:crypto";

const CRISP_API_BASE = "https://api.crisp.chat/v1";

/** Name shown on the agent's messages, and how we recognise them afterwards. */
export const SUPPORT_AGENT_NICKNAME = "Léa · Anyloc";

export type CrispMessage = {
  type: string;
  from: "user" | "operator";
  origin: string;
  content: unknown;
  fingerprint: number;
  timestamp: number;
  user?: { nickname?: string; user_id?: string };
};

export type CrispConversationMeta = {
  email?: string;
  nickname?: string;
  segments?: string[];
};

export function isCrispConfigured() {
  return Boolean(
    process.env.CRISP_WEBSITE_ID &&
      process.env.CRISP_PLUGIN_IDENTIFIER &&
      process.env.CRISP_PLUGIN_KEY
  );
}

function getWebsiteId() {
  const websiteId = process.env.CRISP_WEBSITE_ID;
  if (!websiteId) {
    throw new Error("CRISP_WEBSITE_ID is not configured.");
  }
  return websiteId;
}

async function crispRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const identifier = process.env.CRISP_PLUGIN_IDENTIFIER;
  const key = process.env.CRISP_PLUGIN_KEY;

  if (!identifier || !key) {
    throw new Error("Crisp plugin token is not configured.");
  }

  const response = await fetch(`${CRISP_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${identifier}:${key}`).toString("base64")}`,
      "X-Crisp-Tier": "plugin",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Crisp ${method} ${path} failed: ${response.status} ${text.slice(0, 300)}`);
  }

  const json = (await response.json().catch(() => null)) as { data?: T } | null;
  return json?.data as T;
}

function conversationPath(sessionId: string, suffix: string) {
  return `/website/${getWebsiteId()}/conversation/${encodeURIComponent(sessionId)}/${suffix}`;
}

export function getConversationMessages(sessionId: string) {
  return crispRequest<CrispMessage[]>("GET", conversationPath(sessionId, "messages"));
}

export function getConversationMeta(sessionId: string) {
  return crispRequest<CrispConversationMeta>("GET", conversationPath(sessionId, "meta"));
}

/** Text the visitor sees, signed with the agent's name. */
export function sendOperatorText(sessionId: string, content: string) {
  return crispRequest("POST", conversationPath(sessionId, "message"), {
    type: "text",
    from: "operator",
    origin: "chat",
    content,
    user: { nickname: SUPPORT_AGENT_NICKNAME },
  });
}

/** Private note: only operators see it, never the visitor. */
export function sendPrivateNote(sessionId: string, content: string) {
  return crispRequest("POST", conversationPath(sessionId, "message"), {
    type: "note",
    from: "operator",
    origin: "chat",
    content,
    user: { nickname: SUPPORT_AGENT_NICKNAME },
  });
}

export function setComposing(sessionId: string, composing: boolean) {
  return crispRequest("PATCH", conversationPath(sessionId, "compose"), {
    type: composing ? "start" : "stop",
    from: "operator",
  });
}

export function setConversationSegments(sessionId: string, segments: string[]) {
  return crispRequest("PATCH", conversationPath(sessionId, "meta"), { segments });
}

export function markConversationUnresolved(sessionId: string) {
  return crispRequest("PATCH", conversationPath(sessionId, "state"), { state: "unresolved" });
}

/**
 * Plugin hooks are signed: HMAC-SHA256 of "[timestamp;body]" with the hook
 * secret. Website hooks aren't, so they're accepted on a secret URL key instead.
 */
export function verifyCrispHook({
  rawBody,
  timestamp,
  signature,
  urlKey,
}: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  urlKey: string | null;
}) {
  const hookSecret = process.env.CRISP_HOOK_SECRET;
  if (hookSecret && timestamp && signature) {
    const expected = createHmac("sha256", hookSecret)
      .update(`[${timestamp};${rawBody}]`)
      .digest("hex");
    if (safeEqual(expected, signature)) {
      return true;
    }
  }

  const webhookKey = process.env.CRISP_WEBHOOK_KEY;
  return Boolean(webhookKey && urlKey && safeEqual(webhookKey, urlKey));
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
