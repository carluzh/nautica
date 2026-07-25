// API/domain types for the server. These mirror the frontend game domain
// (lib/game/types.ts) so the subgraph broker returns frontend-ready shapes.

export type VerifyStep = "face" | "passport" | "orb";

/** World ID 4.0 credential identifiers (issuer_schema_id: 1 / 11 / 9303 / 9310). */
export type WorldCredential = "proof_of_human" | "selfie" | "passport" | "mnc";

export type Verification = { face: boolean; passport: boolean; orb: boolean };

export type SpeciesId =
  | "Physalia"
  | "Jellyfish"
  | "Crab"
  | "ShoreFish"
  | "ShorePlant"
  | "SeaStar"
  | "Lionfish"
  | "Turtle"
  | "Other";

export type QuestKind = "free" | "paid";

export type Quest = {
  id: string;
  kind: QuestKind;
  title: string;
  spec: string; // the 0G check / what the photo must show
  species: SpeciesId;
  reward: number; // XP
  usdc?: number;
  partner?: string;
  requirements?: string[];
};

/** Record of a 0G TEE classification; verifiable fields come from x_0g_trace. */
export type Attestation = {
  model: string;
  verdict: "pass" | "fail";
  confidence: number; // 0..1
  label: string;
  tee: string; // honest enclave tech when verified (e.g. "TDX · TeeTLS"), else "unverified"/"simulated"
  hash: string; // keccak256 attestation id (on-chain anchor)
  simulated: boolean; // derived: !(x_0g_trace.tee_verified === true) — the honesty-critical field
  at: number;
  // Verifiable-inference detail from a live 0G call (optional: on-chain-reconstructed
  // records omit them). The XP gate keys on `simulated`, so these are display/audit.
  teeVerified?: boolean;
  attestationSource?: "0g-router:verify_tee" | "unverified" | "simulated" | "error";
  provider?: string | null; // TEE provider 0x address
  requestId?: string | null; // 0G router request id
  chatId?: string | null;
  verifiability?: string; // model's verifiability, read from /v1/models (e.g. "TeeTLS")
  teeType?: string; // e.g. "TDX"
  teeVerifier?: string; // e.g. "dstack"
  outputHash?: string; // sha256 of model output (content digest, NOT a TEE proof)
  // On-chain provenance of the serving provider (0G Serving contract getService):
  teeSigner?: string | null; // its registered on-chain TEE signer address
  providerVerifiability?: string | null; // its verifiability mode (TeeTLS | TeeML)
  providerAcknowledged?: boolean | null; // whether it acknowledged its TEE signer on-chain
  // Independent Intel TDX quote verification (DCAP): the provider's hardware
  // attestation verified against Intel's root of trust + bound to its on-chain signer.
  quoteVerified?: boolean | null;
  quoteVerifier?: string | null; // "automata-onchain" | "phala-offchain"
};

export type Profile = {
  userId: string;
  handle: string;
  wallet: string | null;
  xp: number;
  level: number;
  streak: number;
  verification: Verification;
  balanceUsd: number;
};

export type GalleryItem = {
  id: string;
  questId: string;
  species: SpeciesId;
  title: string;
  /** Served URL of the finding photo (relative /images/:id; absent = placeholder). */
  photo?: string;
  attestation: Attestation;
  xp: number;
  usdc?: number;
  lat: number;
  lng: number;
  /** Precision radius (m) the user set around the spot; off-chain, may be absent. */
  radiusM?: number;
  at: number;
  /** On-chain tx that recorded this sighting; reconciles the optimistic item with
   *  the subgraph-indexed one (same txHash). Absent on mock + simulated-fallback items. */
  txHash?: string;
};

export type ActivityEvent = {
  id: string;
  kind: "quest" | "levelup" | "verify" | "payout" | "join";
  title: string;
  detail?: string;
  xp?: number;
  usdc?: number;
  species?: SpeciesId;
  at: number;
};

export type LeaderboardEntry = {
  rank: number;
  handle: string;
  xp: number;
  level: number;
  you?: boolean;
};

export type Payment = {
  id: string;
  partner: string;
  quest: string;
  usdc: number;
  status: "pending" | "settled";
  txHash?: string;
  at: number;
};

/** Plausibility agent verdict for a sighting (see services/plausibility.ts). */
export type PlausibilityVerdict = {
  sightingId: string;
  species: SpeciesId;
  verdict: "plausible" | "unusual" | "implausible";
  score: number; // 0..1
  /** Notable-but-plausible, e.g. an invasive species inside its invaded range. */
  notable?: boolean;
  reasons: string[];
  rangeNote?: string;
  seasonNote?: string;
  /** Count of nearby same-species sightings that corroborate this one. */
  corroboratingNearby?: number;
  /** Optional one-sentence LLM narration of the verdict (only when the agent's
   *  LLM layer is enabled); the deterministic fields above are always present. */
  narrative?: string;
  at: number;
};

export type Session = { userId: string; issuedAt: number };

/** Result of a quest submission (mirrors the frontend submitQuest contract). */
export type SubmitResult =
  | {
      ok: true;
      attestation: Attestation;
      xp: number;
      leveledTo?: number;
      usdc?: number;
      txHash?: string;
    }
  | { ok: false; reason: string; attestation?: Attestation };
