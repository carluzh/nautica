// Shared game domain types. The whole /app hub reads and writes this state via
// the GameProvider (lib/game/provider.tsx). Panels should import from here.

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

/** World ID verification ladder — SEPARATE from the XP level. Gates payouts. */
export type VerifyStep = "face" | "passport" | "orb";

export type Verification = {
  face: boolean; // Selfie Check
  passport: boolean; // Identity / Document Check
  orb: boolean; // Orb (strongest)
};

/** A tamper-proof-ish record of a 0G TEE classification. Illustrative in the skeleton. */
export type Attestation = {
  model: string; // e.g. "qwen3-vl-30b"
  verdict: "pass" | "fail";
  confidence: number; // 0..1
  label: string; // what the model saw
  tee: string; // attestation tech, e.g. "Intel TDX · TeeTLS"
  hash: string; // 0x… digest of the attestation
  at: number; // epoch ms
  // Verifiable-inference detail (present on live 0G submissions; absent on
  // on-chain-reconstructed gallery items and pure-mock records).
  simulated?: boolean;
  teeVerified?: boolean;
  attestationSource?: "0g-router:verify_tee" | "unverified" | "simulated" | "error";
  provider?: string | null; // TEE provider address (0G chain)
  requestId?: string | null;
  verifiability?: string; // "TeeTLS" | "TeeML"
  teeSigner?: string | null; // provider's on-chain registered TEE signer
  providerVerifiability?: string | null;
  providerAcknowledged?: boolean | null;
  quoteVerified?: boolean | null; // independent Intel TDX quote (DCAP) verified
  quoteVerifier?: string | null; // "automata-onchain" | "phala-offchain"
};

export type QuestKind = "free" | "paid";
export type QuestStatus = "available" | "verifying" | "done" | "failed";

export type Quest = {
  id: string;
  kind: QuestKind;
  title: string;
  /** The 0G spec / what the photo must show. */
  spec: string;
  species: SpeciesId;
  reward: number; // XP for free quests
  status: QuestStatus;
  // Paid-only:
  usdc?: number;
  partner?: string;
  requirements?: string[]; // e.g. ["Dorsal view", "Ventral view", "Size reference"]
  // On-chain quest state (from the subgraph via GET /quests). All optional:
  // absent in mock/pure-frontend mode -> board treats absence as available.
  // onchain:false = not yet createQuest'd on-chain (recordCompletion would revert)
  // -> not tappable. remainingUsd = remaining USDC escrow. underfunded = pool can't
  // cover the next payout.
  onchain?: boolean;
  remainingUsd?: number;
  underfunded?: boolean;
};

export type GalleryItem = {
  id: string;
  questId: string;
  species: SpeciesId;
  title: string;
  /** Data URL or remote URL of the captured photo (may be undefined = placeholder). */
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

/** A location a user commits to a submission: a chosen spot + a precision radius,
 *  optionally anchored to (and validated against) their live GPS fix. */
export type PickedPlace = {
  lat: number;
  lng: number;
  radiusM: number;
  anchorLat?: number;
  anchorLng?: number;
  gpsAnchored: boolean;
};

/** An ambient community observation shown on the map. Map-only and read-only:
 * kept SEPARATE from the player's own `GalleryItem`s so it never touches their
 * XP, gallery or stats — it only makes the field read as a living survey. */
export type Sighting = {
  id: string;
  species: SpeciesId;
  lng: number;
  lat: number;
  label?: string;
};

/** The plausibility agent's verdict for a sighting (mirrors server/src/types.ts).
 *  Loaded lazily per gallery card; additive to the existing GalleryItem shape. */
export type PlausibilityVerdict = {
  sightingId: string;
  species: SpeciesId;
  verdict: "plausible" | "unusual" | "implausible";
  score: number; // 0..1
  notable?: boolean; // e.g. an invasive species inside its invaded range
  reasons: string[];
  rangeNote?: string;
  seasonNote?: string;
  corroboratingNearby?: number;
  narrative?: string; // optional one-sentence LLM narration (agent LLM layer)
  at: number;
};

export type ActivityKind = "quest" | "levelup" | "verify" | "payout" | "join";

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  title: string;
  detail?: string;
  xp?: number;
  usdc?: number;
  species?: SpeciesId;
  attestation?: Attestation;
  at: number;
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

export type LeaderboardEntry = {
  rank: number;
  handle: string;
  xp: number;
  level: number;
  you?: boolean;
};

export type LevelInfo = {
  level: number;
  xpInto: number; // xp earned into the current level
  xpSpan: number; // xp needed to clear the current level
  xpToNext: number; // remaining to next level
  progress: number; // 0..1 within the current level
  totalXp: number;
  nextUnlock: string | null;
};

export type UserState = {
  connected: boolean;
  handle: string;
  wallet: string | null; // payout wallet; null = not connected yet
  xp: number;
  streak: number;
  verification: Verification;
  balanceUsd: number; // claimable USDC from paid quests
};

/** Which overlay/modal is open in the hub. */
export type PanelId =
  | "quest"
  | "profile"
  | "gallery"
  | "settings"
  | "payments"
  | "leaderboard";

/** Result of a quest submission — shared by the provider and the API client. */
export type SubmitResult =
  | { ok: true; attestation: Attestation; leveledTo?: number; usdc?: number; txHash?: string }
  | { ok: false; reason: string; attestation?: Attestation };
