import { createHash } from "node:crypto";
import { config, integrations } from "../config";
import { log } from "../lib/logger";

// Google sign-in verification. Real path validates the Google ID token via
// Google's tokeninfo endpoint and checks the audience; without GOOGLE_CLIENT_ID
// it runs dev-mock (accepts the token, derives a stable sub). Production should
// verify the JWT signature locally against Google's JWKS (google-auth-library).

export type GoogleOk = { ok: true; sub: string; email?: string; name?: string; simulated: boolean };
export type GoogleErr = { ok: false; reason: string };

export async function verifyGoogleToken(idToken: string): Promise<GoogleOk | GoogleErr> {
  if (!idToken) return { ok: false, reason: "missing Google id token" };

  if (!integrations.google) {
    log.warn("google: dev-mock verify (GOOGLE_CLIENT_ID unset)");
    const sub = "dev_" + createHash("sha256").update(idToken).digest("hex").slice(0, 12);
    return { ok: true, sub, email: "dev@nautica.local", name: "Dev Player", simulated: true };
  }

  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    const data = (await res.json().catch(() => ({}))) as {
      sub?: string;
      aud?: string;
      exp?: string;
      email?: string;
      name?: string;
      error_description?: string;
    };
    if (!res.ok || !data.sub) return { ok: false, reason: data.error_description || "invalid Google token" };
    if (data.aud !== config.GOOGLE_CLIENT_ID) return { ok: false, reason: "Google token audience mismatch" };
    if (data.exp && Number(data.exp) * 1000 < Date.now()) return { ok: false, reason: "Google token expired" };
    return { ok: true, sub: data.sub, email: data.email, name: data.name, simulated: false };
  } catch (err) {
    log.error("google: verify request failed", { err: String(err) });
    return { ok: false, reason: "google verifier unreachable" };
  }
}
