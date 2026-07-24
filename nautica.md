# Nautica — Master Brief (ETHGlobal Lisbon 2026)

Rewritten 24.07.2026. This version throws out prediction markets entirely (see "Why we pivoted" below) and settles on a citizen-science leveling game. Sponsors locked: **World ID + 0G + The Graph**. Team: A (carluzh) = story/pitch/UI/brand/testing docs. C = senior Solidity/DeFi dev. Deadline So 26.07. 09:00 WEST (hard). Hacking start Fr ~21:00.

## 0. Why we pivoted (keep for Q&A)

Earlier versions resolved prediction markets from user-submitted photos of real finds. That path is unfixable: you cannot prove an image is authentic and taken at a place (analog hole for content, unauthenticated GPS for location, both permanent). With money on a market, one verified human could submit a fake claim and drain the other side, and neither World ID, AI fake-detection, nor GPS stops it. So we removed the adversarial money layer. In a leveling game the free tiers stake only XP (no exploit worth the effort), and the paid tier is small, partner-defined, and sybil-gated, which makes the residual fraud tolerable and auditable instead of fatal.

## 1. The idea (final, verbindlich)

**Nautica = a citizen-science mobile game.** Users log in with World ID, complete daily nature-photo quests to earn XP and level up, and at Level 5 unlock a paid quest tier funded by research partners. 0G's verifiable AI checks every submission, and The Graph powers leaderboards and the public sightings feed. The output is a growing, proof-of-humanity-gated, AI-verified marine and coastal biodiversity dataset (GBIF-compatible), and the game is the engine that produces it.

Two things make it more than a photo app: contributions come from provably-unique humans (World ID), and each contribution's quality is provably checked (0G TEE attestation). That is what lets research partners trust the data enough to pay for it.

## 2. Core loop and mechanics

**Login and tiers.** User authenticates with World ID and picks a verification tier. The 3 tiers are World's own credential strengths:

1. **Device** (basic): play the free game, earn XP, level up.
2. **Document / Passport** (Identity Check): required to reach the paid tier.
3. **Orb** (Selfie Check, strongest): required to claim paid-quest payouts above a threshold.

Rationale, stated in the pitch: stronger action needs stronger proof of humanity. Earning XP is cheap to allow; being paid real money must be hard to sybil-farm.

**Free progression.**
- Everyone starts at Level 1.
- **3 free daily quests** worth **5, 10, 25 XP**. A quest is a photo task: "photograph a common fish," "photograph a shore plant," "photograph a crab," etc.
- Level curve tuned so **Level 5 takes about a week with some skipped quests**. Sample tunable curve (cumulative): L2 at 30 XP, L3 at 75, L4 at 135, L5 at 210. At roughly 30 XP/day (skips included) that is about 7 days.

**Paid tier (unlocks at Level 5).**
- A **4th daily quest** appears, **contracted and funded by a research company or university**.
- Paid out on completion in **USDC on Base**.
- Partner-defined requirements go beyond image plus location: multiple images, specific body parts (e.g. dorsal and ventral views), a count, size reference, or extra metadata. The partner sets the spec; 0G checks the submission against it.

**Roadmap (pitch slide, not built this weekend):** leaderboards, public sightings map, Pokemon-Go-style collection and streaks, avatar and cosmetic customization, premium tier, more species and regions.

## 3. Where each sponsor is load-bearing (not decoration)

- **World ID.** Login and one-human enforcement. Without proof-of-humanity, XP leaderboards and especially paid quests are farmed to zero by multi-accounting. The tier system maps directly onto World's two paid track eligibilities: **Selfie Check ($3.5k)** and **Identity Check ($3.5k)**, one slot, both eligible. Load-bearing.
- **0G.** Verifiable TEE-attested vision classification of every submission via `qwen3-vl-30b` (confirmed live, see Section 8). Free quests: is this actually a crab / fish / plant? Paid quests: does it match the partner spec (species, body part, count)? The TEE attestation is a tamper-proof proof of quality, which is exactly what makes a research partner trust the dataset and pay for it. Fits **0G Best AI Product ($6k)** and matches their "verifiable research agent" wish-example.
- **The Graph.** Subgraph over quest completions, XP, level-ups, payouts, and sightings, all emitted as on-chain events on Base. Powers leaderboards, the public sightings feed, and partner dashboards. "Risk/data monitoring" and AI-use-case framing fit their tracks. Studio dev endpoint (100k queries/month free) is enough; no decentralized publish needed.
- **Chain.** Contracts and payouts on **Base / Base-Sepolia**. 0G is used as Compute only (off-chain AI), not as a chain, so The Graph indexes Base cleanly on its normal network. This is the correct split: The Graph indexes your contract chain, 0G is the AI service, they never conflict.

## 4. Anti-fraud (honest, since we learned this the hard way)

The analog hole is not solved (a stock photo, a reused photo, an AI image, or a photo of a screen can be submitted). We do not claim fraud-proof. We claim fraud-resistant and auditable, which is enough because:

- **Free tier stakes are XP only.** Not worth the effort to cheat.
- **Paid tier is defended in layers:** World ID caps one human to one payout stream and requires a stronger credential tier; 0G classification gates quality and checks against the partner spec; partner requirements (multiple images, specific body parts, freshness) raise the bar; a **server-issued freshness nonce or challenge** ensures the photo postdates the quest (kills stock and pre-generated images); payouts per quest are small.
- **Partners accept noise.** Citizen science always has noise. What they get from us that a normal app cannot give: World ID provenance plus 0G attestation on every record, so quality is auditable rather than "trust our server."

## 5. Demo cut (36h, 1:1 fix)

Keep it to one full loop plus the paid unlock.
1. World ID login, pick a verification tier.
2. Daily quest board shows 3 free quests. Complete one (photograph a crab). 0G classifies it with a TEE attestation, XP is awarded, user levels up. Show the attestation.
3. Fast-forward to Level 5 (honest time-skip). The 4th paid quest appears from a partner (e.g. "photograph species X, dorsal and ventral views"). Submit. 0G verifies against the spec. USDC payout settles on Base.
4. The Graph-powered leaderboard and public sightings feed update live from the on-chain events.

Everything else (map, streaks, cosmetics, premium) is narrated roadmap.

## 6. Sponsor tracks reference ($88k, verified 23.07.)

| Sponsor | Track | Pot | Typ |
|---|---|---|---|
| The Graph | Best AI Tooling | $7.000 | Classic |
| The Graph | Best AI Use Case | $4.000 | Classic |
| The Graph | Composable/Standardized Products | $4.000 | Classic |
| World | Selfie Check Beta | $3.500 | Classic |
| World | Identity Check Beta | $3.500 | Classic |
| World | AgentKit New Use Cases | $8.000 | Classic |
| 0G | Best AI Product | $6.000 | Classic |
| 0G | Best Infra & Tooling | $4.500 | Classic |
| 0G | Keep Building (Continuity) | $4.500 | Continuity |

Rules: max **3 partner-prizes per submission**; one multi-track sponsor = 1 slot with eligibility for all its tracks. Continuity tracks are a separate lane, off-limits for a fresh classic build. Classic must be started during the hackathon; no project-specific pre-existing code or assets.

## 7. Judging and logistics

- **Format:** 7 min/team = 4 min demo + 3 min Q&A. Partner judging runs only on submission material (text + 2 to 4 min video), not booth demos.
- **Criteria:** Technicality, Originality, Practicality, Usability (UI/UX/DX), WOW Factor.
- **Ort/Zeit:** Pavilhao Carlos Lopes, Lisbon. Submission So 09:00 WEST hard (no late submissions).
- **Workshops Fr:** 0G 14:30, Uniswap 15:00, Graph 15:30, Sui 16:00, World 16:30, Hedera 17:00, 1inch 17:30.
- **Submission duties:** public repo, incremental commits (no single commit), AI attribution in README, video 2 to 4 min real narration (no AI voice/speedup), World: 2 testing docs, exactly 3 partner-prizes checked.

## 8. Confirmed tech facts (live-tested 24.07.2026)

- **0G Compute is OpenAI-compatible.** Endpoint `https://router-api.0g.ai/v1`, standard `/chat/completions`. `GET /v1/models` returns the live catalog with no auth. A vision request with an `image_url` content block reaches the auth check and returns 401 "missing authorization," so the request shape is accepted and the only remaining step is a funded Bearer key from pc.0g.ai.
- **Confirmed image-capable, TEE-attested model:** `qwen3-vl-30b` (text+image, TDX, TeeTLS verifiable, ~$0.00000002/prompt token). Alternatives if needed: `0gm-1.0-35b-a3b` (image, TeeML), `kimi-k3` / `minimax-m3` / `qwen3.7-plus` (image+video, TEE). Fallback: local BioCLIP 2 (MIT, open_clip, CPU-capable) for species, with a 0G LLM verifying the text.
- **0G gotchas (from research):** faucet only 0.1 OG/day vs 3 OG min deposit + 1 OG/provider, so request tokens at booth/Discord today. Auth header single-use, 30 req/min, 5 concurrent, Node >=22, server-side only, browser SDK has no auto-funding. Galileo testnet has been reset with a new chain-id before.
- **World ID:** simulator only with staging app-id; test action without max_verifications limit (else team nullifier burned); signal/action byte-identical FE and BE; cloud-verify or on-chain-verify on Base (nullifier for one-human caps). Confirm Selfie/Identity beta access and any Orb prerequisite at the booth.
- **The Graph:** supports Base on the decentralized network; hosted service deprecated 2026 but Studio dev endpoint is enough; startBlock = deploy block; freeze schema early.
- **Photo/GPS:** iOS browser camera strips all EXIF; capture GPS via `navigator.geolocation` plus server time, never from EXIF, never trust client-supplied values (mock location is trivial). Treat location as a soft signal, not proof.

## 9. Kill-tests and open items

1. **Funded 0G key** to run one real end-to-end image classification call. Get tokens at booth/Discord.
2. **World booth:** Selfie/Identity beta access + Orb prerequisite; create test action without a verifications limit.
3. **Quest content:** finalize the starter quest list (fish, plant, crab, etc.) and the exact 0G prompt/spec per quest, including the paid-quest partner-spec format (which body parts, how many images).
4. **On-chain event schema** for quest completion / XP / payout, frozen early so the subgraph schema is stable.
5. **Freshness mechanism:** server-issued nonce/challenge per quest so submissions must postdate the quest.
6. **Base contract + payout path** (USDC on Base-Sepolia) wired end-to-end.

## 10. Q&A prep (hardest questions)

1. "Can users cheat the photo checks?" Not fraud-proof, fraud-resistant and auditable. Free tier stakes only XP. Paid tier is layered: one-human World ID caps, stronger credential tier, 0G spec-check, partner multi-image/body-part requirements, freshness nonce, small payouts. Every record carries World ID provenance + 0G attestation, so partners get auditable quality.
2. "Why blockchain / why these sponsors?" World ID is the only clean way to pay unique humans globally without KYC-ing each one and without bots draining the pool. 0G gives tamper-proof proof that each submission was actually checked by the stated model. The Graph turns the on-chain contribution log into leaderboards and an open dataset. Remove any one and the trust or the product breaks.
3. "Who funds the paid quests?" Research companies, universities, NGOs, and coastal municipalities that already fund citizen science (Shark Spotters precedent was ~70% city-funded). At demo the team seeds a partner treasury.
4. "Is the data any good for real science?" Proof-of-humanity plus AI verification plus open GBIF-compatible format is a stronger provenance guarantee than typical citizen-science apps, which is the pitch to data buyers.
5. "Is this legal?" Testnet today. It is a rewards game for verified humans, not a financial market, so it avoids the regulatory surface the earlier market idea carried.
