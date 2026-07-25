import { Hono } from "hono";
import { store } from "../lib/store";
import type { AppEnv } from "../lib/http";
import { requireAuth } from "../middleware/auth";
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
