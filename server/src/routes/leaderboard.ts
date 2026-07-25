import { Hono } from "hono";
import { verifySession } from "../lib/session";
import type { AppEnv } from "../lib/http";
import { getLeaderboard } from "../services/subgraph";

export const leaderboardRoutes = new Hono<AppEnv>();

/** GET /leaderboard — public ranking; marks the caller's row if a session is sent. */
leaderboardRoutes.get("/", async (c) => {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const userId = verifySession(token)?.userId ?? null;
  return c.json(await getLeaderboard(userId));
});
