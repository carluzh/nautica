import { Hono } from "hono";
import { z } from "zod";
import { store } from "../lib/store";
import type { AppEnv } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { verifySiwe } from "../services/siwe";
import { PAID_UNLOCK_LEVEL, xpForLevel } from "../lib/levels";
import { getActivity, getGallery, getProfile } from "../services/subgraph";
import { assessSighting } from "../services/plausibility";
import type { PlausibilityVerdict } from "../types";

export const meRoutes = new Hono<AppEnv>();
meRoutes.use("*", requireAuth);

// Verdicts are deterministic for a given sighting; cache per sighting id so the
// agent runs once per photo rather than on every gallery-card open.
const plausibilityCache = new Map<string, PlausibilityVerdict>();

/** GET /me - the player's profile (XP, level, streak, verification, balance). */
meRoutes.get("/", async (c) => {
  const profile = await getProfile(c.get("userId"));
  if (!profile) return c.json({ error: "user not found" }, 404);
  return c.json(profile);
});

/** GET /me/gallery - verified sightings (the collection). */
meRoutes.get("/gallery", async (c) => {
  return c.json(await getGallery(c.get("userId")));
});

/** GET /me/activity - the history feed. */
meRoutes.get("/activity", async (c) => {
  return c.json(await getActivity(c.get("userId")));
});

/** GET /me/payments - paid-quest settlements. */
meRoutes.get("/payments", (c) => {
  return c.json(store.getUser(c.get("userId"))?.payments ?? []);
});

/** Assess (or return the cached) plausibility verdict for one sighting, scoped to
 *  the caller. Exported so the eager post-record job (services/sighting-jobs.ts) can
 *  warm this same cache the moment the subgraph indexes the sighting. */
export async function primePlausibility(
  userId: string,
  sightingId: string,
): Promise<PlausibilityVerdict | null> {
  const cacheKey = `${userId}:${sightingId}`;
  const cached = plausibilityCache.get(cacheKey);
  if (cached) return cached;

  const verdict = await assessSighting(userId, sightingId);
  if (!verdict) return null;

  // Bound the cache (simple FIFO eviction) so it can't grow without limit.
  if (plausibilityCache.size >= 5000) {
    const oldest = plausibilityCache.keys().next().value;
    if (oldest) plausibilityCache.delete(oldest);
  }
  plausibilityCache.set(cacheKey, verdict);
  return verdict;
}

/** GET /me/sightings/:id/plausibility - the agent's verdict for one sighting,
 *  cached per id. 404 when the sighting isn't the caller's (or not yet indexed). */
meRoutes.get("/sightings/:id/plausibility", async (c) => {
  const verdict = await primePlausibility(c.get("userId"), c.req.param("id"));
  if (!verdict) return c.json({ error: "sighting not found" }, 404);
  return c.json(verdict);
});

/** POST /me/wallet - attach a payout wallet to a World ID / Google user (SIWE). */
meRoutes.post("/wallet", async (c) => {
  const parsed = z.object({ message: z.string(), signature: z.string() }).safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid siwe payload" }, 400);

  const result = await verifySiwe(parsed.data.message, parsed.data.signature);
  if (!result.ok) return c.json({ error: result.reason }, 401);

  const userId = c.get("userId");
  const updated = store.updateUser(userId, { wallet: result.address });
  if (!updated) return c.json({ error: "user not found" }, 404);
  return c.json({ profile: await getProfile(userId) });
});

/** POST /me/demo-level - hackathon shortcut: floor the caller to Level 5 (paid unlock). */
meRoutes.post("/demo-level", async (c) => {
  const userId = c.get("userId");
  const u = store.getUser(userId);
  if (!u) return c.json({ error: "user not found" }, 404);
  store.updateUser(userId, {
    xp: Math.max(u.xp, xpForLevel(PAID_UNLOCK_LEVEL)), // 210; never lowers xp
    activity: [
      { id: `a_${Date.now()}`, kind: "levelup", title: `Reached Level ${PAID_UNLOCK_LEVEL}`, at: Date.now() },
      ...u.activity,
    ],
  });
  return c.json({ profile: await getProfile(userId) });
});
