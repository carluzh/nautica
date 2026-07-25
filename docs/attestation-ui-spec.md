# Spec: surface the 0G TEE attestation honestly in the UI

Handoff for the frontend session. The backend already sends every verifiable field
on the wire; the UI just doesn't type or show them, and the current badge is
hard-coded green "0G verified" for real, simulated, and mock alike (the dishonest
bit to fix). Backend is done and live-verified; this is a frontend-only change.

## The data is already on the wire

`POST /quests/:id/submit` returns `{ ok:true, attestation, … }` with the full
attestation verbatim (`server/src/routes/quests.ts`). `lib/api/client.ts` types it
as the frontend (subset) `Attestation`, so the extra keys arrive at runtime and are
just untyped. Fields available on a live submission:

`teeVerified`, `simulated`, `attestationSource`, `provider`, `requestId`, `chatId`,
`verifiability`, `teeType`, `teeVerifier`, `outputHash`, `teeSigner`,
`providerVerifiability`, `providerAcknowledged`, `quoteVerified`, `quoteVerifier`.

Two caveats that shape the design:
- Subgraph-reconstructed gallery items legitimately have only `model, verdict, label, hash, simulated:false, at` (they omit the live fields). New fields must be optional.
- Pure mock mode (`lib/game/mock.ts` `att()`, `lib/game/provider.tsx` `classify()`) emits only base fields; the badge must degrade honestly when flags are absent.

## Honesty model (drive the badge from the fields)

```ts
const hwVerified = a.quoteVerified === true;                        // strongest: independent Intel TDX quote
const verified   = a.teeVerified === true;                         // router-attested TEE
const simulated  = a.simulated === true || a.attestationSource === "simulated";
const errored    = a.attestationSource === "error";
const onchain     = !verified && a.simulated === false && a.teeVerified === undefined; // reconstructed record
// else (flags absent): unverified / demo
```

| State | Badge | Tone | Icon |
|---|---|---|---|
| `hwVerified` | "TEE-verified (Intel TDX)" | success | `ShieldCheck` |
| `verified` (not hw) | "TEE-verified" | success | `ShieldCheck` |
| `onchain` | "0G attested" | success, muted | `ShieldCheck` |
| `simulated` | "Simulated" | warning/muted | `FlaskConical` |
| `errored` / mock | "Unverified" | muted/destructive | `ShieldAlert` |

Only `teeVerified === true` triggers the strong claim; `quoteVerified === true` is
the *independently verified* upgrade. Never render simulated or reconstructed
records as green "verified".

## Changes

### (a) `lib/game/types.ts` — extend `Attestation` (additive, all optional)
Mirror `server/src/types.ts` `Attestation`: add optional `simulated?, teeVerified?,
attestationSource?, provider?, requestId?, chatId?, verifiability?, teeType?,
teeVerifier?, outputHash?, teeSigner?, providerVerifiability?, providerAcknowledged?,
quoteVerified?, quoteVerifier?`. Keep every new field optional so reconstructed and
mock records still typecheck. (This file is co-edited with the backend mirror and
the plausibility work; additive-only, coordinate the merge.)

### (b) `lib/format.ts` — link helpers (new)
```ts
export const CHAINSCAN = "https://chainscan.0g.ai";
export const chainscanAddress = (addr: string) => `${CHAINSCAN}/address/${addr}`;
export function shortAddr(addr: string, size = 4) {
  return addr.length > 2 + size * 2 ? `${addr.slice(0, 2 + size)}…${addr.slice(-size)}` : addr;
}
```
`provider` and `teeSigner` are 0G-chain addresses → `chainscanAddress(addr)`, render
`shortAddr(addr)`, `target="_blank" rel="noreferrer"`, `ExternalLink` icon.

### (c) `components/app/attestation.tsx` — rewrite
Drive the `Badge` label/tone/icon from the status above (not the hard-coded string).
Factor a local `<AttestationDetail>` containing (each guarded by presence):
- Status + Pass/Fail; Model; Confidence; Enclave (`a.tee`).
- Verifiability: `a.verifiability ?? a.providerVerifiability` (TeeTLS/TeeML).
- **Independent quote**: when `a.quoteVerified === true`, a line "Intel TDX quote
  verified · {a.quoteVerifier}" (e.g. `automata-onchain`) — this is the differentiator.
- Provider: chainscan link on `a.provider`.
- TEE signer: chainscan link on `a.teeSigner` + a check when `a.providerAcknowledged`.
- Request id (`a.requestId`, tnum) and attestation hash (`a.hash`).
- When simulated: an explicit "Simulated — no TEE proof (0G key not set)" line, no green.

**Host:** the current Radix Tooltip can't hold clickable links (dismisses on
leave). Convert to a **Popover** — `radix-ui` already bundles it (no new dep); add
`components/ui/popover.tsx` mirroring `components/ui/tooltip.tsx`.

### (d) Consumers (no prop changes)
`gallery-dialog.tsx`, `tab-activities.tsx`, `quest-submit-dialog.tsx` already pass
the attestation. In `quest-submit-dialog.tsx` `SuccessView` (the one place the full
live attestation is guaranteed) render `<AttestationDetail>` as a **persistent
panel** (not a popover) so the verified links/quote/mode are visible without
interaction. Optionally link `SubmitResult.txHash` as `chainscan.0g.ai/tx/{txHash}` there.

### (e) Optional — keep the mock demo representative
Mock mode has no flags, so the badge reads "Unverified". To exercise the verified
look in mock, seed realistic values (`teeVerified:true, quoteVerified:true,
quoteVerifier:"automata-onchain", verifiability:"TeeTLS", provider:"0x…",
teeSigner:"0x…", providerAcknowledged:true`) in `mock.ts att()` and `provider.tsx
classify()`. This makes mock *look* verified; API mode always shows true backend state.

## Effort: ~1.5–2h. Key files: `attestation.tsx` (rewrite), `lib/game/types.ts`,
`lib/format.ts`, `components/ui/popover.tsx` (new), `quest-submit-dialog.tsx`.
Backend reference (read-only): `server/src/types.ts` Attestation, `server/src/services/zerog.ts` buildAttestation.
