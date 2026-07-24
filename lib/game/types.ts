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
  wallet: string;
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
