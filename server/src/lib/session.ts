import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config";
import type { Session } from "../types";

// Stateless HMAC-signed session tokens: `base64url(payload).base64url(sig)`.
// No DB needed to validate; revocation (if wanted later) can layer on the store.
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(payload: string): string {
  return b64url(createHmac("sha256", config.SESSION_SECRET).update(payload).digest());
}

export function createSession(userId: string): string {
  const body: Session = { userId, issuedAt: Date.now() };
  const payload = b64url(Buffer.from(JSON.stringify(body)));
  return `${payload}.${sign(payload)}`;
}

export function verifySession(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const body = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (Date.now() - body.issuedAt > TTL_MS) return null;
    return body;
  } catch {
    return null;
  }
}
