# World ID / Selfie Check — Feedback Report (Nautica, ETHGlobal Lisbon 2026)

**What we built with it:** Nautica is a citizen-science platform where you sign in with
World ID, complete photo quests to earn XP, and at Level 5 unlock partner-funded
paid quests that pay USDC on Base. World ID **Selfie Check** is our one-human sign-in and the **sybil gate** that protects the XP leaderboard and the shared USDC payout pool. Identity Check / Orb sit above it as stronger tiers for the paid path but have only been mocked to guarantee quick demoability.

We built a real IDKit 4.0 flow: backend-signed `rp_context`, `IDKitRequestWidget`
with `selfieCheckLegacy` / `identityCheck` / `orbLegacy` presets, and server-side v4
cloud verify. Working prototype: **https://nautica-xi.vercel.app** · code:
`server/src/services/worldid.ts` + `components/app/worldid-widget.tsx`.

This report has two separate sections as required: **Developer feedback** and **User
feedback**, followed by the value questions from the track presentation slides.

---

## Developer feedback

### Integration experience (time-to-integrate, blockers)
The primitives are strong and the successful path is short once you know the shapes; we
lost most of our time to a small number of undocumented mismatches (below). The
RP-signature model — `signRequest({ signingKeyHex, action })` from
`@worldcoin/idkit-core/signing`, key stays server-side, short TTL — is a great 
design, and the controlled `IDKitRequestWidget` (`open` / `onSuccess`) dropped
into our React provider cleanly. Server-side v4 verify
(`POST developer.world.org/api/v4/verify/{rp_id}`, forward the IDKit response) is the
right client/server split.

### Ease of integration
Helped: `@worldcoin/idkit` + `@worldcoin/idkit-core` are clean; the presets
(`selfieCheckLegacy`, `identityCheck({attributes})`, `orbLegacy`) are a nice API.
What got in the way:

1. **v3 vs v4 proof shape** `selfieCheckLegacy()` returns a World ID
   **3.0** proof where `responses[].proof` is a **string**, but v4 proofs use a
   **`string[]`**. Our v4-shaped validation silently rejected valid Selfie Check
   logins until we loosened it (`worldid.ts:55`). Not called out prominently anywhere.
2. **Credential vocabulary differs by proof version.** For a v3 proof the v4 verifier
   rejected `identifier: "selfie"` with *"identifier must be one of orb,
   secure_document, document, device, face"* — a real Selfie Check proof reports
   **`face`**, not `selfie`, so the backend must accept both vocabularies
   (`worldid.ts:62-77`). Undocumented.
3. **`allow_legacy_proofs` must be per-credential.** `selfieCheckLegacy` (v3) needs it
   `true`; `identityCheck` (v4) needs it `false`. A single global flag can't serve
   both; took a review pass to catch.
4. **`signRequest` return vs `rp_context` field names differ.** It returns
   `{ sig, nonce, createdAt, expiresAt }` but the widget wants `{ rp_id, nonce,
   created_at, expires_at, signature }` (`sig`→`signature`, camelCase→snake_case).
5. **Docs 404s.** The quick-start and backend-reference pages we hit returned 404, so
   we reverse-engineered the `rp_context` flow from the SDK types.
6. **`rp_id` vs `app_id`.** The separate RP registration + its signing key (distinct
   from `app_id`) wasn't obvious; one end-to-end "register RP → sign context → verify"
   example would have saved the most time.
7. **Selfie Check access gating.** It's preview / "contact us to enable"; the SDK
   surfaces unavailability only as `credential_unavailable` at widget-open time.

---

## User feedback

*Scope note (honest): our user testing is the team running the full flow **many times
on real devices** during the build and the live demo — repeated hands-on use, though
not a broad public cohort. Observations are about the end-to-end sign-in UX a
first-time user meets.*

- **Comprehension is good when framed as "prove you're a real person," less so as a
  raw "selfie."** In our login gate, users immediately understood *sign in with World
  ID = one account per human, no seed phrase*. The moment that needed hand-holding was
  the selfie/liveness step itself — first-timers weren't sure *why* a face capture was
  needed until the surrounding copy explained it gates rewards and stops multi-accounting.
  Framing the credential around the **outcome** ("so payouts go to real people, once")
  rather than the mechanism ("selfie") landed better.
- **The capture flow is fast and low-friction** — the strongest UX point for an
  onboarding step. For a casual game, a sub-few-second check is amazing
- **The one recurring failure mode was low light.** Across many runs the flow was
  reliable, but in dark rooms the Selfie Check's own screen-illumination lit the face
  too much and the check rejected it as *face too light* (over-exposed), forcing a
  retry
- **Friction/dropoff risk we watched for:** any extra step at sign-in is a place to
  lose casual users, so we keep Selfie Check as the *only* gate to start playing and
  earn XP, and defer the heavier tiers (Identity Check / Orb) to the paid path — you
  only pay more proof when you're about to receive real money.
- **Failure/edge messaging:** camera-permission denial and `credential_unavailable`
  need friendly, actionable copy (we humanized World ID errors so a cancel or an
  unavailable credential doesn't dead-end the user with a raw code).

---

## Value questions (from the track)

**Value of Selfie Check — did it help you act (block / gate / step up)?** Yes, all
three: it **gates** sign-in and XP (one account per human), it **blocks** sybil
farming of the leaderboard and the shared USDC pool (the nullifier caps one human to
one reward stream), and it acts as the base of a **step-up** ladder into the paid
tier. It's the single primitive that makes "pay unique humans, globally, without
KYC-ing each one" possible for us.

**Value of Sybil Score (once available) — how it would factor in:** we'd use it as a
soft, continuous risk signal to complement the binary nullifier — e.g. **risk-tier
paid-quest payout limits** (higher score → higher daily payout / less friction),
**route low-score submissions to extra 0G scrutiny or a stronger tier (Orb) before
payout**, and flag anomalous clusters for review — without hard-blocking a genuine
new user. Today that logic is binary; a score would let us shape friction to risk.

**POH (Orb) vs Selfie Check — differences and how we split cohorts:** we don't have
production cohort metrics (hackathon), so this is our design rationale, stated
honestly. We map **stronger proof to stronger action**: Selfie Check for broad,
low-value access (sign-in, XP, logging sightings) where speed/low-friction maximizes
participation, and **Orb / Identity Check for the high-value path** (unlocking and
being paid for research quests) where a stronger anti-sybil guarantee is worth the
added friction.

**Overall sentiment — would you keep using it and expand it?** Yes. Selfie Check is
the right first gate for a consumer app that has to pay real, unique humans, and we'd
keep it as the sign-in default and expand the tier ladder (Selfie → Identity → Orb)
as the value at stake grows. The integration friction was all documentation-shaped
(the v3/v4 shapes above), not primitive-shaped — the primitives themselves we'd reach
for again.

---

## Identity Check note (we also test the Identity Check Beta)

**Why the requested attributes are necessary (data minimization):** our Identity Check
requests exactly **one** attribute — `minimum_age ≥ 18` (`worldid-widget.tsx:30`) —
because the paid tier disburses real USDC, so an 18+ eligibility gate is the minimum
needed to move money to a person. We deliberately request **no other attributes** (no
exact date of birth, name, nationality, or jurisdiction): the game only needs "adult,
unique human," so we ask for the least identity data that satisfies that. The same
`identity_attested` result also upgrades the user's tier server-side
(`worldid.ts:179`).

*Live-demo note: we relaxed the paid-quest gate to accept Selfie Check so the on-stage
flow stays a single verification; by design the paid tier steps up to Identity Check /
Orb.*
