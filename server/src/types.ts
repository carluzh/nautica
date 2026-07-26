// API/domain types for the server. These mirror the frontend game domain
// (lib/game/types.ts) so the subgraph broker returns frontend-ready shapes.

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

export type Quest = {
  id: string;
  title: string;
  spec: string; // the 0G check / what the photo must show
  species: SpeciesId;
  reward: number; // XP
};

/** Record of a 0G TEE classification; verifiable fields come from x_0g_trace. */
export type Attestation = {
  model: string;
  verdict: "pass" | "fail";
  confidence: number; // 0..1
  label: string;
  tee: string; // honest enclave tech when verified (e.g. "TDX · TeeTLS"), else "unverified"/"simulated"
  hash: string; // keccak256 attestation id (on-chain anchor)
  simulated: boolean; // derived: !(x_0g_trace.tee_verified === true) - the honesty-critical field
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
  wallet: string; // deterministic derived on-chain address, always set
  xp: number;
  level: number;
  streak: number;
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
  lat: number;
  lng: number;
  /** Precision radius (m) the user set around the spot; off-chain, may be absent. */
  radiusM?: number;
  at: number;
  /** On-chain tx that recorded this sighting; reconciles the optimistic item with
   *  the subgraph-indexed one (same txHash). Absent on mock + simulated-fallback items. */
  txHash?: string;
  /** 0G Storage root hash of the photo (decentralized provenance), when uploaded. */
  storageRoot?: string;
};

export type ActivityEvent = {
  id: string;
  kind: "quest" | "levelup" | "join";
  title: string;
  detail?: string;
  xp?: number;
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

/** An independent species-recognition signal - a second model cross-checking 0G's
 *  classification. Part of the agent's verification, surfaced but NON-gating. */
export type SpeciesRecognition = {
  model: string; // e.g. "iNaturalist"
  label: string; // predicted scientific name
  commonName?: string;
  confidence: number; // 0..1
  agrees: boolean; // prediction matches the quest's expected species
  alternatives?: { label: string; confidence: number }[];
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
  /** Independent second-model species recognition (mock; non-gating cross-check). */
  recognition?: SpeciesRecognition;
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
      txHash?: string;
    }
  | { ok: false; reason: string; attestation?: Attestation };
