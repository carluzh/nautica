import "dotenv/config";
import { z } from "zod";

// Everything optional: the server boots with zero config and stubs each missing
// integration. Presence of a key flips that integration from "stub" to "live".
const Env = z.object({
  PORT: z.coerce.number().default(8080),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  SESSION_SECRET: z.string().default("dev-insecure-session-secret-change-me"),

  WORLD_APP_ID: z.string().optional(),
  WORLD_ACTION: z.string().default("nautica-login"),
  WORLD_VERIFY_URL: z.string().default("https://developer.worldcoin.org/api/v2/verify"),

  // Google sign-in. Without GOOGLE_CLIENT_ID the server runs dev-mock Google auth.
  GOOGLE_CLIENT_ID: z.string().optional(),
  // SIWE (wallet sign-in) — the domain a signed message must bind to.
  SIWE_DOMAIN: z.string().default("localhost:3000"),
  // Accept dev placeholder wallet signatures (parity with World ID/Google dev-mock).
  // Set to "false" in production so only real SIWE signatures pass.
  SIWE_DEV_BYPASS: z.string().default("true"),

  ZEROG_ROUTER: z.string().default("https://router-api.0g.ai/v1"),
  ZEROG_API_KEY: z.string().optional(),
  ZEROG_MODEL: z.string().default("qwen3-vl-30b"),

  SUBGRAPH_URL: z.string().optional(),
  SUBGRAPH_API_KEY: z.string().optional(),

  CHAIN_RPC_URL: z.string().default("https://sepolia.base.org"),
  CHAIN_ID: z.coerce.number().default(84532),
  RELAYER_PRIVATE_KEY: z.string().optional(),
  QUEST_CONTRACT_ADDRESS: z.string().optional(),
  USDC_ADDRESS: z.string().optional(),
});

const parsed = Env.parse(process.env);

export const config = {
  ...parsed,
  corsOrigins: parsed.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean),
  siweDevBypass: parsed.SIWE_DEV_BYPASS !== "false",
};

/** Which integrations are wired vs. stubbed — surfaced at GET /health. */
export const integrations = {
  worldId: Boolean(parsed.WORLD_APP_ID),
  google: Boolean(parsed.GOOGLE_CLIENT_ID),
  zeroG: Boolean(parsed.ZEROG_API_KEY),
  subgraph: Boolean(parsed.SUBGRAPH_URL),
  chain: Boolean(parsed.RELAYER_PRIVATE_KEY && parsed.QUEST_CONTRACT_ADDRESS),
} as const;

export type Integrations = typeof integrations;
