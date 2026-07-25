# World ID integration feedback (Nautica, ETHGlobal)

Built a real IDKit 4.0 flow: backend-signed `rp_context`, `IDKitRequestWidget` with
`selfieCheckLegacy` / `orbLegacy` / `identityCheck` presets, and server-side v4 cloud
verify. Selfie Check for one-human sign-in, Identity Check to gate paid quests.
Overall it works and the primitives are strong. Notes from actually wiring it:

## What worked well

- `@worldcoin/idkit` + `@worldcoin/idkit-core` are clean. Presets (`selfieCheckLegacy`,
  `identityCheck({attributes})`, `orbLegacy`) are a nice API, and the controlled
  `IDKitRequestWidget` (`open` / `onSuccess`) dropped into our provider easily.
- The RP-signature model is a good design: `signRequest({ signingKeyHex, action })`
  from `@worldcoin/idkit-core/signing`, key stays server-side, short TTL.
- Server-side v4 verify (`POST developer.world.org/api/v4/verify/{rp_id}`, forward the
  IDKit response) is the right split and worked once we found the shapes.

## Rough edges / doc gaps

1. **v3 vs v4 proof shape is a real trap.** `selfieCheckLegacy()` returns a **World ID
   3.0** proof where `responses[].proof` is a **string**, but v4 proofs use a
   `string[]`. Our v4-shaped validation rejected valid Selfie Check logins with a
   generic error until we loosened it. This difference isn't called out prominently.
2. **Credential identifier vocabulary differs by proof version.** The v4 verifier, for
   a v3 proof, rejected `identifier: "selfie"` with *"identifier must be one of orb,
   secure_document, document, device, face"* - a real Selfie Check proof reports
   **`face`**, not `selfie`. So backends must map both vocabularies. Not documented.
3. **`allow_legacy_proofs` must be per-credential.** `selfieCheckLegacy` (v3) needs it
   `true`; `identityCheck` (v4) needs it `false`. A single global flag can't serve
   both intents; this took a review pass to catch.
4. **`signRequest` return vs `rp_context` field names differ.** It returns
   `{ sig, nonce, createdAt, expiresAt }` but the widget wants
   `{ rp_id, nonce, created_at, expires_at, signature }` (`sig`→`signature`,
   `createdAt`→`created_at`). Minor, but easy to miss.
5. **Docs 404s.** The quick-start and backend-reference pages we tried returned 404,
   so we reverse-engineered the `rp_context` flow from the SDK types + search.
6. **`rp_id` vs `app_id`.** The separate RP registration + its signing key (distinct
   from `app_id`) wasn't obvious up front; a single end-to-end "register RP, sign
   context, verify" example would have saved time.
7. **Selfie Check access gating.** It's preview / "contact us to enable", which is
   fine, but the SDK surfaces it only as `credential_unavailable` at widget-open time.

## Suggestions

- Document the v3-vs-v4 proof shape (`proof` string vs array) and the identifier
  vocabulary (`selfie` vs `face`) side by side.
- Derive `allow_legacy_proofs` guidance per preset in the docs.
- Fix the 404 quick-start / backend pages; add one copy-pasteable full-stack example
  (register RP, `signRequest`, open widget, v4 verify).
