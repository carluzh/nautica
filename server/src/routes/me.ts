import { Hono } from "hono";
import { z } from "zod";
import { store } from "../lib/store";
import type { AppEnv } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { verifySiwe } from "../services/siwe";
import { getActivity, getGallery, getProfile } from "../services/subgraph";

export const meRoutes = new Hono<AppEnv>();
meRoutes.use("*", requireAuth);

/** GET /me — the player's profile (XP, level, streak, verification, balance). */
meRoutes.get("/", async (c) => {
  const profile = await getProfile(c.get("userId"));
  if (!profile) return c.json({ error: "user not found" }, 404);
  return c.json(profile);
});

/** GET /me/gallery — verified sightings (the collection). */
meRoutes.get("/gallery", async (c) => {
  return c.json(await getGallery(c.get("userId")));
});

/** GET /me/activity — the history feed. */
meRoutes.get("/activity", async (c) => {
  return c.json(await getActivity(c.get("userId")));
});

/** GET /me/payments — paid-quest settlements. */
meRoutes.get("/payments", (c) => {
  return c.json(store.getUser(c.get("userId"))?.payments ?? []);
});

/** POST /me/wallet — attach a payout wallet to a World ID / Google user (SIWE). */
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
