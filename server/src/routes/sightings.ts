import { Hono } from "hono";
import type { AppEnv } from "../lib/http";
import { store } from "../lib/store";

// Public community feed. No auth: guests and logged-out visitors see everyone's
// verified sightings on the map, same spirit as the public /images serving.
export const sightingsRoutes = new Hono<AppEnv>();

/** GET /sightings - all users' logged sightings, newest first, capped at 1000. */
sightingsRoutes.get("/", (c) => {
  const feed = store
    .allUsers()
    .flatMap((u) =>
      u.gallery
        .filter((g) => Number.isFinite(g.lat) && Number.isFinite(g.lng))
        .map((g) => ({
          id: `u-${u.wallet.slice(0, 8)}-${g.id}`,
          wallet: u.wallet,
          handle: u.handle,
          species: g.species,
          lng: g.lng,
          lat: g.lat,
          label: `${g.title} · ${u.handle}`,
          at: g.at,
          photo: g.photo,
          xp: g.xp,
        })),
    )
    .sort((a, b) => b.at - a.at)
    .slice(0, 1000);
  return c.json(feed);
});
