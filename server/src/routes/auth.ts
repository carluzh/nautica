import { Hono } from "hono";
import { z } from "zod";
import { createSession } from "../lib/session";
import { store } from "../lib/store";
import { newUser, userIdFor } from "../lib/user";
import type { AppEnv } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { tierFromLevel, verifyWorldProof } from "../services/worldid";
import { verifyGoogleToken } from "../services/google";
import { issueNonce, verifySiwe } from "../services/siwe";
import { getProfile } from "../services/subgraph";
import type { Verification, VerifyStep } from "../types";

export const authRoutes = new Hono<AppEnv>();

/**
 * Find-or-create a user by a namespaced external identity and mint a session.
 * `grantTier` marks a World ID verification tier; `wallet` auto-attaches (wallet login).
 */
async function establishSession(
  externalKey: string,
  opts: { handle: string; wallet?: string | null; grantTier?: VerifyStep },
) {
  let userId = store.userIdByExternal(externalKey);
  if (!userId) {
    userId = userIdFor(externalKey);
    const verification: Partial<Verification> = {};
    if (opts.grantTier) verification[opts.grantTier] = true;
    store.createUser(newUser({ userId, handle: opts.handle, wallet: opts.wallet ?? null, verification }));
    store.linkExternal(externalKey, userId);
  } else {
    const u = store.getUser(userId);
    if (u) {
      const patch: Partial<ReturnType<typeof newUser>> = {};
      if (opts.grantTier && !u.verification[opts.grantTier]) {
        patch.verification = { ...u.verification, [opts.grantTier]: true };
      }
      if (opts.wallet && !u.wallet) patch.wallet = opts.wallet;
      if (Object.keys(patch).length) store.updateUser(userId, patch);
    }
  }
  return { userId, token: createSession(userId), profile: await getProfile(userId) };
}

// ---- World ID ---------------------------------------------------------------
const proofSchema = z.object({
  proof: z.string(),
  merkle_root: z.string(),
  nullifier_hash: z.string(),
  verification_level: z.enum(["device", "document", "secure_document", "orb"]),
});

authRoutes.post("/worldid", async (c) => {
  const parsed = z.object({ proof: proofSchema, action: z.string().optional() }).safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid proof payload" }, 400);

  const result = await verifyWorldProof({ proof: parsed.data.proof, action: parsed.data.action });
  if (!result.ok) return c.json({ error: result.reason }, 401);

  const short = result.nullifier.replace(/^0x/, "").slice(0, 6);
  const { token, profile } = await establishSession(`worldid:${result.nullifier}`, {
    handle: `diver_${short}`,
    grantTier: tierFromLevel(result.level),
  });
  return c.json({ token, profile, simulated: result.simulated });
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

// ---- World ID tier upgrade (authed) -----------------------------------------
authRoutes.post("/verify", requireAuth, async (c) => {
  const parsed = z.object({ proof: proofSchema, action: z.string().optional() }).safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid proof payload" }, 400);

  const result = await verifyWorldProof({ proof: parsed.data.proof, action: parsed.data.action });
  if (!result.ok) return c.json({ error: result.reason }, 401);

  const userId = c.get("userId");
  const u = store.getUser(userId);
  if (!u) return c.json({ error: "user not found" }, 404);

  const tier = tierFromLevel(result.level);
  const updated = store.updateUser(userId, {
    verification: { ...u.verification, [tier]: true },
    activity: [
      { id: `a_${Date.now()}`, kind: "verify", title: `Verified with ${tier.charAt(0).toUpperCase()}${tier.slice(1)}`, at: Date.now() },
      ...u.activity,
    ],
  });
  return c.json({ tier, profile: updated ? await getProfile(userId) : null });
});
