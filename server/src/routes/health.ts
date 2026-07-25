import { Hono } from "hono";
import { integrations } from "../config";

const startedAt = Date.now();

export const healthRoutes = new Hono();

/** GET /health — liveness + which integrations are live vs. stubbed. */
healthRoutes.get("/", (c) => {
  return c.json({
    ok: true,
    service: "nautica-server",
    uptimeSec: Math.round((Date.now() - startedAt) / 1000),
    integrations: {
      worldId: integrations.worldId ? "live" : "dev-mock",
      google: integrations.google ? "live" : "dev-mock",
      zeroG: integrations.zeroG ? "live" : "simulated",
      subgraph: integrations.subgraph ? "live" : "store-fallback",
      chain: integrations.chain ? "live" : "simulated",
    },
  });
});
