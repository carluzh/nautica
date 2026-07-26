<!-- INTERNAL DEMO PREP — do NOT commit/push (the repo is public and this lists what's mocked). -->
# Nautica demo cheat sheet

## The whole app in 5 lines

1. Nautica is a wildlife-spotting game where players photograph and log real sea creatures to earn rewards.
2. **World ID** proves every player is a real, unique human (a quick phone face scan), so nobody can farm rewards with fake accounts.
3. **0G** runs the AI that checks each submitted photo is genuine and matches the quest, and gives us a cryptographic proof the AI ran inside a tamper-proof secure chip.
4. **The Graph** is the search engine that reads our game's data off the blockchain, powering the leaderboard, galleries, and quest funding instantly.
5. Everything you see in the demo is live on a test blockchain (Base Sepolia); a few extras are wired up but toggled off for demo speed and can be flipped on.

## What's REAL vs MOCKED across all three

| Sponsor | Piece | Status |
|---|---|---|
| World ID | Selfie Check sign-in + server-side proof check + one-human anti-fake token | REAL |
| World ID | Orb and document (Identity Check) tiers | MOCKED for demo speed |
| 0G | AI photo checking + all 3 secure-chip verification steps | REAL |
| 0G | Decentralized photo storage (0G Storage) | MOCKED for demo speed |
| The Graph | Live subgraph, leaderboard, galleries, quest funding, AI data source | REAL |
| The Graph | Base mainnet target + a small "recognition %" chip | MOCKED for demo speed |

Honest one-liner for any mocked item: *"That part is fully coded against the real SDK and just switched off to keep the live demo fast. It's a config flip, not a rewrite."*

---

## World ID: proving each player is a real, unique human

**What it is / what we do with it:** World ID is a way to prove someone is a real, unique person without collecting their name or documents. When a player signs in, their phone does a quick live face scan (a "Selfie Check") and hands us back an anonymous one-per-human marker called a *nullifier* (a private token that's unique to each person but reveals nothing about who they are). We tie every account to that marker, so one human can only ever have one account. We don't just trust the phone: our own server re-checks the proof with World's official verifier before granting access. That same one-human token also gates our paid bounty quests so real-money payouts only go to genuine people.

| Piece | Status | Plain note |
|---|---|---|
| Selfie Check sign-in (live face scan) | REAL | Opens the real World ID widget; health check says live |
| Server verifies the proof itself | REAL | We send the proof to World's official verifier; not just trusting the phone |
| One-account-per-human binding | REAL | Same person signing up again gets sent to their existing account |
| Paid-quest gate | REAL (loosened) | Gate is enforced; set to accept Selfie Check for demo instead of the stricter document tier |
| Orb tier + document Identity Check | MOCKED | Wired in code, simulated for demo speed |

**Q&A:**
- **Is this really World ID or a mockup?** It's real. It opens the official World ID widget, does a live face scan, and our server verifies it before letting you in.
- **How does it stop fake accounts?** Every verified person gives us a private one-per-human token. We tie each account to it, so the same person can't make a second account.
- **Do you store people's faces?** No. The scan happens on the user's own phone. All we ever get is an anonymous proof and a one-human token, never the face image.
- **Why the quick face tier and not the strongest one?** Speed for the live demo. The stronger Orb and document tiers are built in and can be switched on for production.

---

## 0G: verifiable AI that judges the photo

**What it is / what we do with it:** 0G is a decentralized AI layer. When a player submits a wildlife photo, we send it through 0G's network to a vision AI model that decides pass or fail and explains what it sees. The special part is 0G can prove the AI ran inside a *TEE* (Trusted Execution Environment: a locked-down secure area of a chip that can cryptographically prove what ran inside, which even the machine's owner cannot peek into or alter). We don't just take 0G's word for it. Our server independently double-checks the provider's secure-chip proof against public blockchain records and against Intel's own verification system, so the "verified" badge is something we confirmed ourselves.

| Piece | Status | Plain note |
|---|---|---|
| AI photo checking (pass/fail gates the reward) | REAL | Live with a funded key; every photo really goes to the model |
| 3-layer secure-chip proof verification | REAL | We re-check the proof against blockchain records and Intel's root of trust ourselves |
| "The model itself runs in the secure chip" | PARTIAL | We prove a secure component signed the response; today's provider runs the model weights on a centralized system upstream, so we say we verified the provider's attestation |
| 0G Storage (durable decentralized photo copies) | MOCKED | Fully coded with 0G's SDK, toggled off for demo; photos serve from local cache |

**Q&A:**
- **What does 0G do here?** It runs the AI that looks at each photo and decides if it's genuine and matches the quest, plus gives us a proof the AI ran securely.
- **Is it live or faked?** The AI checking and all three verification steps are live. Only decentralized photo storage is coded but switched off for the demo.
- **What's a TEE and why care?** It's a sealed, tamper-proof area of a chip that can prove what ran inside. It means the AI's verdict couldn't have been secretly changed to hand out rewards unfairly.
- **Do you just trust 0G?** No. Our own server re-checks the proof against public blockchain records and Intel's official verification.
- **What if 0G is down mid-demo?** We fail closed. An outage never counts as a passing photo; the user just doesn't get an automatic verified pass.
- **Which 0G products do you use?** Two — **0G Compute** for the verifiable AI (live), and **0G Storage** for a durable, tamper-evident copy of each photo with a provenance hash (coded with 0G's SDK — the full 0G stack). Storage is toggled off in the live demo because its wallet isn't funded with 0G testnet tokens yet; it's a config flip, not a rewrite.

---

## The Graph: reading our game data off the blockchain

**What it is / what we do with it:** The Graph is the search engine we use to read our game's data off the blockchain. Every time a player logs a creature or completes a quest, our smart contract emits an event. Our *subgraph* (a searchable index of a smart contract's events, deployed to The Graph) watches the chain and organizes those events into clean tables like players, sightings, quests, and a leaderboard, so our app can fetch them instantly instead of scanning raw blockchain data. We also expose that same subgraph to an AI agent, which uses The Graph as its live data source to judge whether a sighting makes sense for that place and season.

| Piece | Status | Plain note |
|---|---|---|
| Live subgraph indexing our contract | REAL | Version 0.0.4, deployed and indexing on Base Sepolia; health check says live |
| Leaderboard, galleries, activity, quest funding | REAL | All read straight from The Graph during the demo, not local mock data |
| AI plausibility agent reading sightings back | REAL | Re-reads recorded sightings from The Graph and scores range + season |
| Small "recognition %" chip on gallery cards | MOCKED | A cosmetic number; does not affect the real verdict |
| Base mainnet target | MOCKED | Only Base Sepolia (test network) is real; mainnet is a config change away |

**Q&A:**
- **What's a subgraph in one sentence?** A small program we deployed to The Graph that watches our contract and turns its raw blockchain events into clean, searchable data our app can query instantly.
- **Is it actually live?** Yes. Our subgraph is deployed and indexing our real contract right now, and the leaderboard, galleries, and quest funding all read from it.
- **Why not read the blockchain directly?** Direct reads are slow and messy. The Graph gives us a sorted leaderboard or a player's full history in one fast query instead of scanning every block.
- **How does the AI use it?** Our plausibility agent reads a sighting and nearby same-species sightings back from The Graph, then judges whether that creature belongs at that place and season.
- **Is this on mainnet?** Not yet. It runs on Base Sepolia, a test network, which is standard for a hackathon. Pointing it at mainnet is a config change, not a rewrite.
