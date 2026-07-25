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

/** Tamper-proof-ish record of a 0G TEE classification. */
export type Attestation = {
  model: string;
  verdict: "pass" | "fail";
  confidence: number; // 0..1
  label: string;
  tee: string; // enclave tech, e.g. "Intel TDX · TeeTLS"
  hash: string; // digest of the attestation
  simulated: boolean; // true when 0G was stubbed
  at: number;
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
  attestation: Attestation;
  xp: number;
  usdc?: number;
  lat: number;
  lng: number;
  at: number;
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
