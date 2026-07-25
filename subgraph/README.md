# Nautica subgraph

## Live deployment (Base Sepolia)

- **Contract** `NauticaQuests`: [`0x70219d85cBb0d8d33934f9D77E4988aC2b231519`](https://sepolia.basescan.org/address/0x70219d85cBb0d8d33934f9D77E4988aC2b231519#code) (verified on Basescan + Blockscout). On-chain quest registry with per-quest USDC escrow; a paid quest can't be created without escrowing its reward.
- **Subgraph query endpoint**: `https://api.studio.thegraph.com/query/114962/nautica/v0.0.4`
- Set `SUBGRAPH_URL` to that endpoint to serve the app from The Graph. `GET /health` then reports `subgraph: "live"`.
- The `server/mcp/` Subgraph MCP server exposes this same subgraph as agent tools.

Indexes the Nautica Quest contract on Base into the entities that power the
leaderboard, per-player stats, and the XP/leveling + activity feed. It is the
real backend for `server/src/services/subgraph.ts` (the broker): while
`SUBGRAPH_URL` is unset the broker serves store-derived mock data shaped exactly
like the queries below; set `SUBGRAPH_URL` to this subgraph's query endpoint and
the app reads from The Graph with no frontend change.

## Entities

- `Global` - protocol-wide totals (players, sightings, xp, usdc). Singleton.
- `Player` - keyed by lowercased wallet; xp, streak, balance, verification overlay.
- `Sighting` - one per passed quest submission (immutable).
- `Attestation` - the on-chain 0G attestation reference (immutable).
- `Activity` - quest / levelup / payout feed entries (immutable).

`level` is intentionally **not** stored - it is a pure function of `xp`
(`levelForXp`) that the broker computes, so the curve can change without a
subgraph redeploy.

## What it indexes (planned Base events)

The contract is expected to emit (see `abis/NauticaQuests.json`):

```solidity
event SightingRecorded(
  address indexed player,
  bytes32 indexed questId,   // utf8(app quest id) right-padded to 32 bytes
  int64            latE6,    // latitude  * 1e6
  int64            lngE6,    // longitude * 1e6
  uint32           xp,
  uint256          usdc6,    // USDC 6-dec (0 for free quests)
  bytes32          attestationHash
);
event PayoutSettled(address indexed player, bytes32 indexed questId, uint256 usdc6);
event PlayerRegistered(address indexed player, string handle); // optional identity
```

The relayer in `server/src/services/chain.ts` sends the tx that emits these; its
`QUEST_ABI` is aligned to the same signatures. `species`/`title` are resolved in
the mapping from `src/registry.ts` (a mirror of `server/src/content.ts`), keyed
by the decoded `questId`.

## Dependency on dev-C (contract deployment)

Before deploying against real data, fill in the two placeholders:

- `subgraph.yaml` / `networks.json`: `source.address` + `startBlock` per network.
- `abis/NauticaQuests.json`: replace with the deployed contract's exported ABI
  (must keep the event signatures above).

The hand-written ABI here lets `graph codegen && graph build` run **now**, before
the contract exists, so the mapping compiles and can be deployed to a test
contract meanwhile.

## Build & deploy

```bash
cd subgraph
npm install
npm run codegen        # generates ./generated from schema + ABI
npm run build          # compiles the AssemblyScript mappings

# Subgraph Studio (dev query URL), then Publish in the Studio UI for the
# decentralized-network Explorer link:
graph auth <deploy-key>
npm run deploy:studio

# Local graph-node fallback (docker-compose) for offline demos:
npm run create-local && npm run deploy-local
```

Point the backend at the resulting query URL:

```
SUBGRAPH_URL=https://api.studio.thegraph.com/query/<id>/nautica/<version>
# SUBGRAPH_API_KEY=<key>   # for the decentralized-network gateway
```

`GET /health` will then report `subgraph: "live"`.
