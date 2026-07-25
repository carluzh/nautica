import { createMiddleware } from "hono/factory";
import { verifySession } from "../lib/session";
import type { AppEnv } from "../lib/http";

/** Gate a route behind a valid session token; exposes `c.get("userId")`. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const session = verifySession(token);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  c.set("userId", session.userId);
  await next();
});
