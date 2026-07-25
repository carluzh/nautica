# Nautica server

The backend that sits between the frontend and The Graph. It does the four things
the client cannot be trusted to do itself:

1. **World ID verification** - verifies IDKit proofs server-side (World requires
   this) and enforces one-human-per-account via nullifiers.
2. **Subgraph broker** - the only thing that talks to The Graph; the frontend
   never sees the endpoint or key.
3. **0G verification** - runs each quest photo through 0G Compute's TEE-attested
   vision model and only awards XP on a pass (with a freshness challenge to kill
   stock/pre-generated photos).
4. **Chain relayer** - a trusted attestor that records completions + settles USDC
   payouts on Base after 0G passes.

Node + TypeScript + [Hono](https://hono.dev). Runs via `tsx` (no build step).

## Run

```bash
cd server
cp .env.example .env      # optional - every integration has a stub fallback
npm install
npm run dev               # tsx watch, http://localhost:8080
# npm start               # same, no watch (use this on the VM)
npm run typecheck
```

With an empty `.env` the server is fully functional in **stub mode**: dev-mock
World ID, simulated 0G attestations, store-backed data, simulated tx hashes.
`GET /health` shows which parts are live vs. stubbed. Flip each on by setting its
env var (see `.env.example`).

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | – | liveness + integration modes |
| POST | `/auth/worldid` | – | verify a World ID proof, return `{ token, profile }` |
| POST | `/auth/google` | – | verify a Google ID token, return `{ token, profile }` |
| GET | `/auth/nonce` | – | issue a single-use SIWE nonce for wallet flows |
| POST | `/auth/wallet` | – | SIWE sign-in (wallet auto-attached), return `{ token, profile }` |
| POST | `/me/wallet` | ✓ | attach a payout wallet to the current user (SIWE) |
| POST | `/auth/verify` | ✓ | add a higher verification tier (Face → Passport → Orb) |
| GET | `/quests` | ✓ | daily board + paid-unlock status |
| POST | `/quests/:id/challenge` | ✓ | issue a single-use freshness nonce |
| POST | `/quests/:id/submit` | ✓ | verify a photo with 0G, award XP, settle payout |
| GET | `/me` · `/me/gallery` · `/me/activity` · `/me/payments` | ✓ | player data |
| GET | `/leaderboard` | opt | ranking (marks your row if a session is sent) |

Auth is a bearer session token (`Authorization: Bearer <token>`) returned by
`/auth/worldid`.

## Submit flow (the core loop)

```
client → POST /quests/:id/challenge         → { nonce }
client captures photo (nonce proves freshness)
client → POST /quests/:id/submit {imageDataUrl, nonce, lat?, lng?}
  server: validate nonce (single-use, unexpired)
        → 0G classifyImage(photo, spec)      → TEE attestation {verdict, hash, …}
        → if pass: chain.recordCompletion + settlePayout (paid)
        → award XP, update gallery/activity/payments
  → { ok, attestation, xp, leveledTo?, usdc?, txHash }
```

## What is stubbed (and where the real thing plugs in)

- **World ID** (`services/worldid.ts`) - real cloud-verify call is written; unset
  `WORLD_APP_ID` runs dev-mock. On-chain verify on Base is the alternative.
- **0G** (`services/zerog.ts`) - real OpenAI-compatible request to the 0G router
  is written; the only TODO is capturing/verifying the TeeTLS quote and flipping
  `simulated:false`.
- **Subgraph** (`services/subgraph.ts`) - GraphQL queries document the expected
  event schema; without `SUBGRAPH_URL` reads come from the in-memory store.
- **Chain** (`services/chain.ts`) - viem write path against a placeholder ABI;
  swap in dev C's contract ABI + address.
- **Store** (`lib/store.ts`) - in-memory behind a `Store` interface; swap for
  Redis/Postgres for multi-instance.

## Deploy to a Google Cloud VM

Two options.

**Docker (recommended):**

```bash
# on the VM (Container-Optimized OS or Debian + Docker)
docker build -t nautica-server ./server
docker run -d --restart=always -p 80:8080 --env-file server/.env nautica-server
```

**Bare node + systemd:** install Node 22, `npm ci --omit=dev` in `server/`, then
run `npm start` under a systemd unit or `pm2`. Put nginx/Caddy in front for TLS,
or terminate TLS at a GCP load balancer. Set `CORS_ORIGIN` to the deployed
frontend origin and a strong `SESSION_SECRET`.
