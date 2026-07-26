# Nautica

A citizen-science mobile game that turns a wildlife photo into a **verified, on-chain
biodiversity record**. Sign in with **World ID**, shoot daily nature-photo quests to
earn XP, and at Level 5 unlock **partner-funded paid quests that pay USDC on Base**.
Every submission is classified by **0G Compute** (TEE-attested vision AI), and **The
Graph** turns the on-chain contribution log into the leaderboard, the public sightings
feed, and an AI plausibility agent.

**Live demo:** https://nautica-xi.vercel.app · ETHGlobal Lisbon 2026 (World ID · 0G · The Graph)

> Design rationale, the pivot, and the pitch live in [`nautica.md`](nautica.md). This
> README is the map of the moving parts.

## The loop

1. **Sign in with World ID** (Selfie Check) — one account per human; the nullifier is the sybil gate on the leaderboard and the shared USDC pool.
2. **Complete a free photo quest** → **0G Compute** classifies the photo in a TEE and returns a verifiable attestation → XP is awarded only on a genuine attested pass → the completion is recorded on **Base Sepolia** and indexed by **The Graph**.
3. **At Level 5**, a partner-funded **paid quest** appears → same verification → the reward **settles in USDC** from the quest's on-chain escrow to the user's wallet.

## Architecture

| Part | Tech | Notes |
|---|---|---|
| Frontend | Next.js 15 / React 19, MapLibre GL, Tailwind/shadcn | Vercel |
| Backend broker | Hono (TypeScript) | GCE VM behind Caddy (auto-HTTPS); brokers **every** integration so the browser never holds a subgraph URL, an 0G key, or the relayer key |
| Contract | `NauticaQuests.sol` (Foundry, Solidity 0.8.24, OpenZeppelin) | Base Sepolia; escrows USDC per quest, relayer-only records + payouts |
| Indexing | The Graph subgraph (AssemblyScript) | Studio `nautica/v0.0.4`; powers leaderboard, sightings, per-species stats |
| Verifiable AI | 0G Compute `qwen3-vl-30b` (Intel TDX) | 3-layer proof: Router `verify_tee` + on-chain Serving registry + independent DCAP quote |
| Identity | World ID IDKit 4.0 | Selfie / Identity / Orb tiers |
| Community data | iNaturalist (prebuilt JSON) | real historical sightings on the map ([`sightings/`](sightings/)) |

**Mock ↔ live:** the whole app runs in a zero-key **mock mode** and flips each
integration to **live** per env var (`NEXT_PUBLIC_API_URL` on the client;
keys on the server). `GET /health` reports which parts are live vs. stubbed.

## Sponsor tech (load-bearing, not decoration)

- **The Graph** — the subgraph is the app's data layer, plus a reusable **Subgraph MCP
  server** ([`server/mcp/`](server/mcp/)) exposing it to any agent, and an on-chain
  plausibility agent. Feedback: [`feedback/thegraph.md`](feedback/thegraph.md).
- **0G** — TEE-attested classification of every photo, with independent Intel TDX quote
  verification. Feedback: [`feedback/0g.md`](feedback/0g.md).
- **World** — Selfie Check sign-in + sybil gate; Identity Check for the paid tier.
  Feedback (dev + user): [`feedback/worldid.md`](feedback/worldid.md).

## Repo layout

```
app/ components/ lib/   Next.js frontend (the /app game hub)
server/                 Hono backend broker  (server/README.md)
  mcp/                  Subgraph MCP server  (server/mcp/README.md)
contracts/             Foundry: NauticaQuests.sol
subgraph/              The Graph subgraph    (subgraph/README.md)
sightings/             iNaturalist data pipeline + committed JSON
feedback/              Per-sponsor integration feedback
```

## Running it

```bash
npm install && npm run dev        # frontend (mock mode with no backend)
cd server && npm install && npm start   # backend broker (live integrations via server/.env)
```

Point the frontend at the backend with `NEXT_PUBLIC_API_URL`. Contract + subgraph
deploy steps are in [`subgraph/README.md`](subgraph/README.md) and `contracts/`.

## Deployed (Base Sepolia)

- **NauticaQuests:** [`0x70219d85cBb0d8d33934f9D77E4988aC2b231519`](https://sepolia.basescan.org/address/0x70219d85cBb0d8d33934f9D77E4988aC2b231519)
- **Subgraph:** `https://api.studio.thegraph.com/query/114962/nautica/v0.0.4`
- **USDC:** `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

## AI tools

**Build:** ChatGPT scaffolded initial client/server boilerplate; **Claude Code** did the
bulk — the contract, the subgraph, the World ID / 0G / The Graph integrations, the
iNaturalist data pipeline, deployment, and iterative feature/bug work.
**In-product (runtime):** 0G Compute's `qwen3-vl-30b` classifies every photo, and
Anthropic's Claude powers the sightings plausibility agent.
