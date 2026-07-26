# The Graph integration feedback (Nautica, ETHGlobal)

Our use: an on-chain wildlife-sighting game on Base Sepolia. A `NauticaQuests`
contract emits `QuestCreated / QuestFunded / SightingRecorded / PayoutSettled /
PlayerRegistered`; a subgraph (Studio `114962/nautica`, live at `v0.0.4`) indexes
those into leaderboard, per-player, XP/level, per-species, and activity entities.
Two consumers read it: a **broker** (`server/src/services/subgraph.ts`) that fronts
the whole frontend, and a **plausibility agent** (`plausibility.ts`) that scores
whether a species was plausibly present at a place/time using *only* data it reads
back from the subgraph. We also wrapped the subgraph in an **MCP server**
(`server/mcp/subgraph-mcp.mjs`) so any agent can query it. Notes are grounded in
that code.

## What worked really well

- **Studio + `graph codegen` is a good mapping-authoring loop.** Codegen off
  `schema.graphql` + the ABI typed every entity and event param, and we could
  `codegen && build` against a hand-written ABI *before the contract existed*, so the
  mapping and the contract were built in parallel — the biggest scheduling win.
- **The entity model expresses the whole game cleanly.** `@derivedFrom` gave free
  reverse edges (`Player.sightings`, `Quest.sightings`), a `Global` singleton for
  totals, and an incrementally-maintained `SpeciesStat` (`bumpSpecies()`,
  `mapping.ts:57`) that directly powers the agent's rarity/corroboration context.
  `orderBy`/`where` covered every read with no post-filtering.
- **The `txHash-logIndex` id scheme paid off three times.** `Sighting.id =
  tx.hash + "-" + logIndex` (`mapping.ts:101`) lets the broker recover the recording
  tx from the id and join off-chain image/precision data with no schema change
  (`normalizeSighting`, `subgraph.ts:154`), and it's the same prefix the latency
  poller matches on. One id convention, three consumers.
- **The dev query endpoint is frictionless.** Plain `POST {query,variables}`, JSON
  back, no key for dev reads; `SUBGRAPH_API_KEY` is sent as `Authorization: Bearer`
  only when set (gateway later) — "dev now, gateway later" is one env var.
- **MCP-over-subgraph was almost trivial and is the most reusable thing we built.**
  `subgraph-mcp.mjs` is ~130 lines: four canned tools + a `nautica_query` arbitrary
  read-only GraphQL escape hatch. Because the subgraph is already a typed GraphQL API,
  exposing it as agent tools was mostly schema-narration; any MCP client (Claude
  Desktop) can then read live on-chain game state in natural language.
- **Mock↔real swap with zero frontend change.** The broker serves identical shapes
  from an in-memory store while `SUBGRAPH_URL` is unset and switches to live reads when
  set (`integrations.subgraph`), reported at `GET /health`. We built and demoed the
  whole app before the subgraph was deployed.

## Real friction / doc gaps (each grounded in our code)

1. **`graph codegen` helps only the *producer* side; the *consumer* side is entirely
   hand-maintained, and we restated the schema three times.** Codegen typed our
   mappings but generated nothing for the app that *reads* the subgraph. So the same
   field set is hand-written in (a) the GraphQL query strings (`PLAYER_QUERY`,
   `LEADERBOARD_QUERY`, … in `subgraph.ts`), (b) the `normalize*` coercers, and (c)
   *again* in the MCP server's own query copies (`subgraph-mcp.mjs`). Nothing keeps
   these in sync with `schema.graphql`. **A typed consumer client generated from a
   deployed subgraph's schema is the single biggest gap** for teams whose product is a
   *consumer* of The Graph, not just a subgraph author.

2. **BigInt/BigDecimal arrive as JSON strings; every numeric field needs manual
   coercion.** The broker re-parses everything (`Number(p.xp ?? 0)`), and a bespoke
   `toMs = v => Number(v ?? 0) * 1000` turns Unix-second `at` into epoch-ms
   (`subgraph.ts:138`). Seconds-vs-ms and string-vs-number are invisible until a
   timestamp reads as 1970. Document wire types per scalar (or emit them in the typed
   client).

3. **AssemblyScript mapping ergonomics: no debugger, no `console`, strict typing,
   manual nulls.** The only in-handler observability is `log.*` — no `console.log`, no
   breakpoint — so a mapping bug means redeploy-and-watch. Strictness bites in
   non-obvious ways: `String.fromCharCode(b as i32)` needs the explicit cast
   (`registry.ts`), `uint32` silently arrives as `BigInt`, every `.load()` is
   `T | null` and must be guarded, and `BigDecimal` has no operators (every conversion
   is `.toBigDecimal().div(E6)` against a hand-built constant). A "mapping author's
   AssemblyScript gotchas" page would save every team the same afternoon.

4. **We hand-built an eager poll-by-txHash loop because reads lag the write.** After
   the relayer's `recordCompletion` is *mined* (we even `waitForTransactionReceipt`),
   the `Sighting` isn't queryable until the indexer catches up. So `sighting-jobs.ts`
   polls the subgraph every `2500ms` for up to `36` attempts (~90s), matching the
   sighting whose `id` starts with `${txHash}-`, then warms the plausibility cache.
   There's no read-your-write or "is block N indexed / index height vs chain head"
   signal we could find, so we approximated one with a fixed-timeout poll. **A
   per-deployment indexing-status read would let us replace the guess with a real
   condition** — this is the sharpest operational gap.

5. **Studio version pinning scatters and drifts.** Each deploy is a new immutable
   version in the query URL (`…/nautica/v0.0.4`). We pin that string in several files
   and they drifted on us: the MCP server defaulted to an older version (`v0.0.2`) than
   the live broker (`v0.0.4`) until we caught it. An opt-in stable "latest" alias per
   environment would stop version pinning from spreading across a codebase.

6. **`startBlock` discovery is manual.** `startBlock: 44611994` is just the contract's
   deploy block, found on the explorer and mirrored in two files. Auto-resolving it
   from a verified contract address in `graph init`/codegen would remove an
   easy-to-get-wrong copy-paste.

7. **Entity immutability is a real decision with sparse guidance.** We split
   append-only records as `@entity(immutable: true)` (`Sighting`, `Attestation`,
   `Activity`) and accruing state as `immutable: false` (`Player`, `Quest.funded`,
   `Global`, `SpeciesStat`). The trade-off (immutable = cheaper/faster but unpatchable;
   mutable = `.load().save()` but costlier) we reasoned out ourselves; a one-paragraph
   "make it immutable unless a later event edits the same row, here's the perf cost"
   rule would help.

8. **Logic duplicated across the language boundary with nothing enforcing the copies.**
   We deliberately don't store `level` (pure function of `xp`), but the thresholds now
   live twice — `subgraph/src/levels.ts` (AssemblyScript, to detect level-up crossings
   for the Activity feed) and `server/src/lib/levels.ts` (TS, to render level) — and if
   they diverge the feed and profile disagree. Same for the questId codec
   (`chain.ts` encode ↔ `subgraph/src/registry.ts` decode). Inherent to
   "logic-in-mapping + same-logic-in-app," but a shared-constant / pure-helper codegen
   story would close the footgun.

9. **Substreams / Composable track does not apply to us — stated honestly.** Ours is a
   plain `kind: ethereum/events`, `wasm/assemblyscript` subgraph (graph-cli `0.97.1`,
   graph-ts `0.38.0`). No Substreams, no composed/aggregation subgraph — our volume
   never warranted it, and adopting it would have been complexity for its own sake.
   Flagging so the sponsor doesn't credit a track we didn't touch.

## Honesty caveat on the data

The subgraph is real and deployed, but the *writer* is a trusted-attestor relayer
that is stubbed unless a relayer key + contract are configured (`chain.ts`). In a
fully-stubbed environment the chain emits nothing and the broker serves store-derived
mock data (`integrations.subgraph === false`). Everything above about live indexing is
from the path where `SUBGRAPH_URL` is set and the contract is live on Base Sepolia —
our `v0.0.4` deployment.

## Concrete suggestions

- **Ship a typed *consumer* client generated from a deployed subgraph's schema** —
  highest leverage; collapses our query-string / `normalize*` / MCP triplication and
  kills scalar-coercion bugs.
- **Expose an indexing-status / "is block N indexed" read** so read-after-write is a
  real condition, not a fixed `2500ms × 36` poll.
- **Document wire types** for `BigInt`/`BigDecimal`/timestamps (strings; `at` is Unix
  seconds) next to the query docs.
- **Add an opt-in stable "latest" alias** for a Studio subgraph so consumers don't pin
  `vX.Y.Z` in N files and drift.
- **Publish a "mapping author's AssemblyScript gotchas" page** (nullability, integer
  widening, `BigDecimal` has no operators, no `console` — only `log.*`).
- **Give immutability a one-paragraph decision rule** with the indexing-cost trade-off.
- **Auto-resolve `startBlock`** from a verified contract address in `graph init`.
