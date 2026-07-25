import { Hono } from "hono";
import { z } from "zod";
import { createSession } from "../lib/session";
import { store } from "../lib/store";
import type { AppEnv } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { tierFromLevel, verifyWorldProof } from "../services/worldid";
import { getProfile } from "../services/subgraph";
import type { Verification } from "../types";

const proofSchema = z.object({
  proof: z.string(),
  merkle_root: z.string(),
  nullifier_hash: z.string(),
  verification_level: z.enum(["device", "document", "secure_document", "orb"]),
});
const bodySchema = z.object({ proof: proofSchema, action: z.string().optional() });

export const authRoutes = new Hono<AppEnv>();

/** POST /auth/worldid — verify a World ID proof, create/return a session. */
authRoutes.post("/worldid", async (c) => {
  const parsed = bodySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid proof payload" }, 400);

  const result = await verifyWorldProof({ proof: parsed.data.proof, action: parsed.data.action });
  if (!result.ok) return c.json({ error: result.reason }, 401);

  const tier = tierFromLevel(result.level);
  let userId = store.userIdByNullifier(result.nullifier);

  if (!userId) {
    userId = `u_${result.nullifier.replace(/^0x/, "").slice(-16)}`;
    const verification: Verification = { face: false, passport: false, orb: false };
    verification[tier] = true;
    store.createUser({
      userId,
      handle: `diver_${result.nullifier.replace(/^0x/, "").slice(0, 6)}`,
      wallet: null,
      xp: 0,
      streak: 0,
      verification,
      balanceUsd: 0,
      createdAt: Date.now(),
      gallery: [],
      activity: [{ id: `a_${Date.now()}`, kind: "join", title: "Joined Nautica", at: Date.now() }],
      payments: [],
    });
    store.linkNullifier(result.nullifier, userId);
  } else {
    const u = store.getUser(userId);
    if (u && !u.verification[tier]) {
      store.updateUser(userId, { verification: { ...u.verification, [tier]: true } });
    }
  }

  const token = createSession(userId);
  const profile = await getProfile(userId);
  return c.json({ token, profile, simulated: result.simulated });
});

/** POST /auth/verify — add a higher verification tier to the current user. */
authRoutes.post("/verify", requireAuth, async (c) => {
  const parsed = bodySchema.safeParse(await c.req.json().catch(() => null));
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
