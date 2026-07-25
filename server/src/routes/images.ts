import { Hono } from "hono";
import type { AppEnv } from "../lib/http";
import { readImage } from "../services/image-store";

// Public finding-photo serving. No auth: <img> requests can't carry a bearer token, and
// ids are content-addressed sha256 hashes (effectively unguessable + immutable), so a
// long-lived cache is safe.
export const imageRoutes = new Hono<AppEnv>();

imageRoutes.get("/:id", async (c) => {
  const img = await readImage(c.req.param("id"));
  if (!img) return c.json({ error: "not found" }, 404);
  return c.body(new Uint8Array(img.bytes), 200, {
    "Content-Type": img.contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
  });
});
