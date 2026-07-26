import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as httpLogger } from "hono/logger";
import { config, integrations } from "./config";
import { log } from "./lib/logger";
import type { AppEnv } from "./lib/http";
import { authRoutes } from "./routes/auth";
import { healthRoutes } from "./routes/health";
import { imageRoutes } from "./routes/images";
import { leaderboardRoutes } from "./routes/leaderboard";
import { logRoutes } from "./routes/log";
import { meRoutes } from "./routes/me";
import { questRoutes } from "./routes/quests";

const app = new Hono<AppEnv>();

app.use("*", httpLogger());
app.use(
  "*",
  cors({
    origin: config.corsOrigins,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  }),
);

app.onError((err, c) => {
  log.error("unhandled error", { err: String(err), path: c.req.path });
  return c.json({ error: "internal error" }, 500);
});

app.get("/", (c) => c.json({ service: "nautica-server", health: "/health" }));
app.route("/health", healthRoutes);
app.route("/auth", authRoutes);
app.route("/quests", questRoutes);
app.route("/log", logRoutes);
app.route("/images", imageRoutes);
app.route("/me", meRoutes);
app.route("/leaderboard", leaderboardRoutes);

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  log.info("nautica-server listening", { port: info.port, integrations });
  if (config.SESSION_SECRET.startsWith("dev-insecure")) {
    log.warn("SESSION_SECRET is the insecure default - set one before any real deploy");
  }
});
