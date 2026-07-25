# End-to-end integration plan

Wires the full pipeline so a submitted photo flows all the way to a rendered,
on-chain-recorded, plausibility-checked gallery card. Every hop already exists and
was verified individually (see the e2e trace); this closes the seams between them.

## The flow (target)

photo → 0G TEE verify → on-chain record (Base Sepolia) → subgraph index →
eager plausibility agent → server merge/save → UI shows attestation + verdict.

## Decisions (locked)

- **Scope:** drive the full integration across all lanes.
- **Verdict timing:** eager server-side job. After the on-chain write, the server
  polls the subgraph until the sighting is indexed, then runs the plausibility
  agent and caches the verdict. No user action required.
- **Location:** a GPS-anchored picker (see below). The user chooses a spot and a
  precision radius, constrained to within a bounded distance of their live GPS fix.
- **Free quests:** keep the simulated-tx fallback for wallet-less users. Their
  sightings stay local (no chain / no subgraph / no plausibility), clearly labeled.

## 1. Location picker (new UI)

New self-contained component `components/app/location-picker.tsx` on the existing
MapLibre + Positron stack (keyless). Zero edits to `sea-map.tsx`.

Numbers (tunable constants, chosen here):

- `MAX_PLACEMENT_KM = 5` — the anti-spoof leash: the chosen spot must lie within
  5 km of the live GPS fix. Coastal sightings are local; 5 km allows privacy fuzz
  and GPS drift without letting a spot land in another region.
- Spot radius `radiusM` — user-selectable precision/area circle around the spot.
  Range 100 m – 2 km, default 250 m.

Behavior:

1. On open, request a fresh `navigator.geolocation.getCurrentPosition` (or reuse a
   known fix passed in). This is the **anchor**.
2. Draw the allowed-placement zone as a translucent circle (`MAX_PLACEMENT_KM`
   around the anchor) — a GeoJSON polygon ring in geographic coords so it scales
   correctly with zoom.
3. A draggable marker is the chosen **spot**, initialized at the anchor. On drag,
   clamp it back onto the boundary if it leaves the zone (project the offset vector
   to `MAX_PLACEMENT_KM`).
4. A slider sets `radiusM`; draw its circle around the spot, live.
5. `onChange({ lat, lng, radiusM })`.

Degradation: if geolocation is denied/unavailable, allow a free pick centered on
the Lisbon default, no leash, and flag the location as `gpsAnchored: false`.

## 2. Submit payload threading

- `submitQuest(questId, photo, place?)` gains an optional `place` =
  `{ lat, lng, radiusM, anchorLat?, anchorLng? }`.
- `api.submit` body already allows `lat?/lng?`; extend to carry `radiusM` +
  `anchorLat/anchorLng`.
- Server `submitSchema` (quests.ts) extends with optional `radiusM`,
  `anchorLat`, `anchorLng`.

## 3. Server submit route (quests.ts)

Minimal edits to the shared submit route:

- Use the client spot for lat/lng instead of the silent random Lisbon fill. If a
  GPS anchor is present, soft-validate `haversine(spot, anchor) <= MAX_PLACEMENT_KM`
  (+ small slack); on violation, clamp to the anchor and mark untrusted. Location is
  a soft signal — never hard-reject on it. Absent coords → keep a labeled default.
- Persist `radiusM` in a server side-table keyed by txHash (see §5) so it survives
  the subgraph round-trip (the event carries no radius; no contract change).
- After a **real** (wallet-path) `recordQuestCompletion` returns a txHash, enqueue
  the eager plausibility job (§4). Simulated-fallback path skips it.

## 4. Eager plausibility job (new module)

New `server/src/services/sighting-jobs.ts`. In-process, no external queue.

- `enqueuePlausibility({ txHash, questId, wallet, block })`.
- Worker polls the subgraph for the sighting whose `transactionHash == txHash`
  (id `txHash-logIndex`), backoff ~2 s, cap ~90 s.
- On found: run `assessSighting(sighting)`; cache the verdict in the existing
  `me.ts` verdict Map keyed by the subgraph sighting id; stash `txHash → sightingId`
  so the UI can reconcile the optimistic item.
- Fail-soft: on timeout, leave the verdict unresolved; the UI's lazy path still
  works as a fallback. Enabling narration is a config flag (ANTHROPIC key), unchanged.

Wire-in to quests.ts is a single call. Low collision.

## 5. Id bridge + save reconciliation

- Add `txHash?` to `GalleryItem` (frontend + server types). The optimistic item
  (`g_${now}`) and the subgraph item (`txHash-logIndex`) reconcile by txHash.
- `SubmitResult` returns `txHash` (already) so the client tags its optimistic item.
- Server side-table `radiusByTx: Map<txHash, radiusM>` merged into `getGallery`
  results so `radiusM` appears on both optimistic and subgraph-sourced items.
- On gallery re-hydrate, a subgraph item with a matching txHash replaces the
  optimistic one; the verdict (cached by sighting id) then loads for it.

## 6. UI display (gallery-dialog.tsx)

- Add a "checking…" chip while a just-submitted sighting is still indexing /
  awaiting its verdict, with a bounded retry (backoff) on `loadPlausibility` so the
  verdict appears without a manual reopen.
- Render the `radiusM` circle for the user's own sightings (stretch; core is the
  chip + picker).

## Collision strategy (3 parallel sessions, shared tree)

New files carry the weight; shared files get surgical wire-ins only:

- **New (no collision):** `components/app/location-picker.tsx`,
  `server/src/services/sighting-jobs.ts`.
- **Small wire-ins (hunk-split commits, mine only):** `quest-submit-dialog.tsx`,
  `provider.tsx`, `lib/api/client.ts`, `lib/game/types.ts`, `gallery-dialog.tsx`,
  `server/src/routes/quests.ts`, `server/src/routes/me.ts`, `server/src/types.ts`.
- **Untouched:** contracts, subgraph mappings, `chain.ts` internals (point-only
  on-chain; no redeploy).

Every commit staged file-by-file / hunk-by-hunk; never `git add -A`.

## Sequencing

1. Picker component (new file) + wire into submit dialog.
2. Payload threading (dialog → provider → client → server schema).
3. Submit route: real coords + validation + job trigger.
4. Eager job module + me.ts cache wire-in.
5. Id bridge + radius side-table + reconcile.
6. Gallery checking/retry state.
7. Verify wallet-path e2e; commit per seam.

## Out of scope / stretch

- On-chain radius (would force a contract redeploy + subgraph change — not worth it).
- Full subgraph round-trip of radius (server side-table covers the demo).
- Persisting verdicts durably (process-memory cache is fine for the demo).
