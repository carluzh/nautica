import { Hono } from "hono";
import { z } from "zod";
import { config, integrations } from "../config";
import { log } from "../lib/logger";
import { createSession } from "../lib/session";
import { store } from "../lib/store";
import { newUser, userIdFor } from "../lib/user";
import { xpFloorForVerification } from "../lib/levels";
import type { AppEnv } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { buildRpContext, tiersFromVerify, verifyWorldProof } from "../services/worldid";
import { verifyGoogleToken } from "../services/google";
import { issueNonce, verifySiwe } from "../services/siwe";
import { getProfile } from "../services/subgraph";
import type { Verification, VerifyStep } from "../types";

export const authRoutes = new Hono<AppEnv>();

/**
 * Find-or-create a user by a namespaced external identity and mint a session.
 * `grantTiers` marks World ID verification tiers; `wallet` auto-attaches (wallet login).
 */
async function establishSession(
  externalKey: string,
  opts: { handle: string; wallet?: string | null; grantTiers?: VerifyStep[] },
) {
  let userId = store.userIdByExternal(externalKey);
  if (!userId) {
    userId = userIdFor(externalKey);
    const verification: Partial<Verification> = {};
    for (const t of opts.grantTiers ?? []) verification[t] = true;
    // Floor xp by the tier granted at signup (no-tier login floors to 0 = no change).
    const xp = xpFloorForVerification({ face: false, passport: false, orb: false, ...verification });
    store.createUser(newUser({ userId, handle: opts.handle, wallet: opts.wallet ?? null, verification, xp }));
    store.linkExternal(externalKey, userId);
  } else {
    const u = store.getUser(userId);
    if (u) {
      const patch: Partial<ReturnType<typeof newUser>> = {};
      const nextV = { ...u.verification };
      let changed = false;
      for (const t of opts.grantTiers ?? []) {
        if (!nextV[t]) { nextV[t] = true; changed = true; }
      }
      if (changed) {
        patch.verification = nextV;
        const floor = xpFloorForVerification(nextV);
        if (floor > u.xp) patch.xp = floor;
      }
      if (opts.wallet && !u.wallet) patch.wallet = opts.wallet;
      if (Object.keys(patch).length) store.updateUser(userId, patch);
    }
  }
  return { userId, token: createSession(userId), profile: await getProfile(userId) };
}

/**
 * One-human enforcement, unified. A World ID nullifier maps to exactly ONE
 * account, keyed in the SAME `worldid:<nullifier>` namespace that login resolves
 * on. So a face-verify done from a Google/wallet account and a later "Sign in
 * with World ID" land on the same account instead of splitting the human in two.
 * Returns false if any nullifier is already owned by a different user.
 */
function bindNullifiers(nullifiers: string[], userId: string): boolean {
  for (const n of nullifiers) {
    const owner = store.userIdByExternal(`worldid:${n}`);
    if (owner && owner !== userId) return false;
  }
  for (const n of nullifiers) store.linkExternal(`worldid:${n}`, userId);
  return true;
}

const TIER_LABEL: Record<VerifyStep, string> = {
  face: "Selfie Check",
  passport: "Identity Check",
  orb: "Orb",
};

/** A verification credential the client can request. Never trusts a raw action. */
type WorldCredentialChoice = "face" | "orb" | "passport";
function parseCredential(q: string | undefined): WorldCredentialChoice {
  return q === "orb" || q === "passport" ? q : "face";
}
/** The server-pinned action + proof-version policy for each credential. */
function credentialConfig(credential: WorldCredentialChoice) {
  const isPaid = credential === "passport"; // Identity Check = the paid-quest gate
  return {
    action: isPaid ? config.WORLD_ACTION_PAID : config.WORLD_ACTION,
    // Selfie Check / Orb use legacy-capable presets (v3); Identity Check is v4-only.
    allow_legacy_proofs: !isPaid,
  };
}

// ---- World ID (IDKit 4.0) ---------------------------------------------------
// The IDKit response forwarded from the client. Passed through UNCHANGED to the
// v4 verifier, so we validate loosely and keep every field. We only read
// identifier + nullifier here; do NOT type `proof` et al. — it is a string in a
// v3 Selfie Check proof and a string[] in a v4 proof, and over-typing it would
// reject a valid Selfie Check login ("invalid proof payload").
const idkitResponseSchema = z
  .object({
    protocol_version: z.string().optional(),
    nonce: z.string().optional(),
    action: z.string().optional(),
    environment: z.string().optional(),
    identity_attested: z.boolean().optional(),
    responses: z
      .array(z.object({ identifier: z.string(), nullifier: z.string() }).passthrough())
      .optional(),
  })
  .passthrough();

const worldProofSchema = z.object({ rp_id: z.string(), idkitResponse: idkitResponseSchema });

/**
 * Step 1 of the World ID handshake. The client fetches a signed RP context for a
 * PINNED action + the right proof-version policy for the requested credential
 * (the client never supplies the action). `credential=face` → Selfie Check
 * one-human; `orb` → Orb; `passport` → Identity Check (paid gate).
 */
authRoutes.get("/worldid/context", (c) => {
  const credential = parseCredential(c.req.query("credential"));
  const { action, allow_legacy_proofs } = credentialConfig(credential);
  return c.json({
    app_id: config.WORLD_APP_ID ?? "app_dev",
    action,
    rp_context: buildRpContext(action),
    environment: config.WORLD_ENV,
    allow_legacy_proofs,
    simulated: !integrations.worldId,
  });
});

/** Step 2: sign in with World ID (Selfie Check). One nullifier = one account. */
authRoutes.post("/worldid", async (c) => {
  const parsed = worldProofSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    log.warn("world id: rejected /worldid payload", { issues });
    return c.json({ error: "invalid proof payload", details: issues }, 400);
  }

  // Login is always the Selfie Check action, pinned server-side.
  const result = await verifyWorldProof({
    idkitResponse: parsed.data.idkitResponse,
    expectedAction: config.WORLD_ACTION,
  });
  if (!result.ok) return c.json({ error: result.reason }, 401);

  // Keyed on worldid:<primary nullifier>. Because /verify binds the SAME
  // namespace, a human who first verified from a Google/wallet account resolves
  // to that account here instead of spawning a duplicate.
  const short = result.nullifier.replace(/^0x/, "").slice(0, 6);
  const session = await establishSession(`worldid:${result.nullifier}`, {
    handle: `diver_${short}`,
    grantTiers: tiersFromVerify(result),
  });
  bindNullifiers(result.nullifiers, session.userId);
  return c.json({ token: session.token, profile: session.profile, simulated: result.simulated });
});

/** World ID tier upgrade for a signed-in user; binds the nullifier to this account. */
authRoutes.post("/verify", requireAuth, async (c) => {
  const schema = worldProofSchema.extend({ credential: z.enum(["face", "orb", "passport"]).optional() });
  const parsed = schema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    log.warn("world id: rejected /verify payload", { issues });
    return c.json({ error: "invalid proof payload", details: issues }, 400);
  }

  const { action: expectedAction } = credentialConfig(parsed.data.credential ?? "passport");
  const result = await verifyWorldProof({ idkitResponse: parsed.data.idkitResponse, expectedAction });
  if (!result.ok) return c.json({ error: result.reason }, 401);

  const userId = c.get("userId");
  const u = store.getUser(userId);
  if (!u) return c.json({ error: "user not found" }, 404);

  if (!bindNullifiers(result.nullifiers, userId)) {
    return c.json({ error: "This World ID is already linked to another account" }, 409);
  }

  const tiers = tiersFromVerify(result);
  const nextV = { ...u.verification };
  for (const t of tiers) nextV[t] = true;
  const label = tiers.map((t) => TIER_LABEL[t]).join(" + ") || "World ID";
  const updated = store.updateUser(userId, {
    verification: nextV,
    xp: Math.max(u.xp, xpFloorForVerification(nextV)),
    activity: [
      { id: `a_${Date.now()}`, kind: "verify", title: `Verified with ${label}`, at: Date.now() },
      ...u.activity,
    ],
  });
  return c.json({ tiers, profile: updated ? await getProfile(userId) : null, simulated: result.simulated });
});

// ---- Google -----------------------------------------------------------------
authRoutes.post("/google", async (c) => {
  const parsed = z.object({ idToken: z.string() }).safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid google payload" }, 400);

  const result = await verifyGoogleToken(parsed.data.idToken);
  if (!result.ok) return c.json({ error: result.reason }, 401);

  const handle = result.name || `player_${result.sub.slice(0, 6)}`;
  const { token, profile } = await establishSession(`google:${result.sub}`, { handle });
  return c.json({ token, profile, simulated: result.simulated });
});

// ---- Wallet (SIWE) ----------------------------------------------------------
authRoutes.get("/nonce", (c) => c.json(issueNonce()));

const siweSchema = z.object({ message: z.string(), signature: z.string() });

authRoutes.post("/wallet", async (c) => {
  const parsed = siweSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid siwe payload" }, 400);

  const result = await verifySiwe(parsed.data.message, parsed.data.signature);
  if (!result.ok) return c.json({ error: result.reason }, 401);

  const addr = result.address;
  const { token, profile } = await establishSession(`wallet:${addr.toLowerCase()}`, {
    handle: `${addr.slice(0, 6)}…${addr.slice(-4)}`,
    wallet: addr, // wallet login auto-attaches the payout address
  });
  return c.json({ token, profile });
});
