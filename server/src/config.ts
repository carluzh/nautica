import "dotenv/config";
import { z } from "zod";

// Everything optional: the server boots with zero config and stubs each missing
// integration. Presence of a key flips that integration from "stub" to "live".
const Env = z.object({
  PORT: z.coerce.number().default(8080),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  SESSION_SECRET: z.string().default("dev-insecure-session-secret-change-me"),

  // Auth is guest + email/password (server-side scrypt) with a deterministic derived
  // on-chain address. No auth-provider env vars are required.

  ZEROG_ROUTER: z.string().default("https://router-api.0g.ai/v1"),
  ZEROG_API_KEY: z.string().optional(),
  ZEROG_MODEL: z.string().default("qwen3-vl-30b"),
  // On-chain provenance: read the serving provider's 0G Serving record (registered
  // TEE signer, verifiability mode, acknowledgement) for the attestation. Read-only
  // 0G chain RPC (no wallet key). ZEROG_SERVING_ADDRESS defaults to the mainnet
  // inference Serving contract; unset it to skip the lookup.
  ZEROG_CHAIN_RPC: z.string().default("https://evmrpc.0g.ai"),
  ZEROG_SERVING_ADDRESS: z.string().default("0x47340d900bdFec2BD393c626E12ea0656F938d84"),
  // DCAP: independently verify the provider's Intel TDX quote against Intel's root
  // of trust via Automata's on-chain verifier (a free eth_call). Defaults target a
  // live Automata deployment on Ethereum Sepolia; Phala's off-chain verifier is the
  // fallback. Swap ZEROG_DCAP_VERIFIER + RPC for a mainnet Automata deployment.
  ZEROG_DCAP_RPC: z.string().default("https://ethereum-sepolia-rpc.publicnode.com"),
  ZEROG_DCAP_VERIFIER: z.string().default("0x76A3657F2d6c5C66733e9b69ACaDadCd0B68788b"),

  SUBGRAPH_URL: z.string().optional(),
  SUBGRAPH_API_KEY: z.string().optional(),

  CHAIN_RPC_URL: z.string().default("https://sepolia.base.org"),
  CHAIN_ID: z.coerce.number().default(84532),
  RELAYER_PRIVATE_KEY: z.string().optional(),
  QUEST_CONTRACT_ADDRESS: z.string().optional(),
});

const parsed = Env.parse(process.env);

export const config = {
  ...parsed,
  corsOrigins: parsed.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean),
};

/** Which integrations are wired vs. stubbed - surfaced at GET /health. */
export const integrations = {
  zeroG: Boolean(parsed.ZEROG_API_KEY),
  subgraph: Boolean(parsed.SUBGRAPH_URL),
  chain: Boolean(parsed.RELAYER_PRIVATE_KEY && parsed.QUEST_CONTRACT_ADDRESS),
} as const;

export type Integrations = typeof integrations;
