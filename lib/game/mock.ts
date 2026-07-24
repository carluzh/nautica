import type {
  ActivityEvent,
  Attestation,
  GalleryItem,
  LeaderboardEntry,
  UserState,
} from "./types";

// Fixed base timestamp (never Date.now at module scope — keeps SSR deterministic).
// Seeds are only shown after the World ID connect click, i.e. post-hydration.
const BASE = 1_753_300_000_000;
const min = 60_000;
const hr = 60 * min;

export const INITIAL_USER: UserState = {
  connected: false,
  handle: "",
  wallet: "",
  xp: 0,
  streak: 0,
  verification: { face: false, passport: false, orb: false },
  balanceUsd: 0,
};

/** A returning player, seeded when they sign in with World ID (demo-friendly). */
export const RETURNING_USER: Partial<UserState> = {
  connected: true,
  handle: "lena.nautica.eth",
  wallet: "0x8Ac…4F21",
  xp: 90, // Level 3
  streak: 4,
  verification: { face: true, passport: false, orb: false },
};

function att(label: string, confidence: number, offset: number): Attestation {
  return {
    model: "qwen3-vl-30b",
    verdict: "pass",
    confidence,
    label,
    tee: "Intel TDX · TeeTLS",
    hash:
      "0x" +
      Math.abs(offset * 2654435761 % 0xffffffffffff).toString(16).padStart(12, "0") +
      "…",
    at: BASE - offset,
  };
}

export const SEED_GALLERY: GalleryItem[] = [
  {
    id: "g-1",
    questId: "q-jelly",
    species: "Physalia",
    title: "Physalia washed up",
    attestation: att("Physalia physalis, bell + tentacles visible", 0.97, 2 * hr),
    xp: 25,
    lat: 38.694,
    lng: -9.421,
    at: BASE - 2 * hr,
  },
  {
    id: "g-2",
    questId: "q-crab",
    species: "Crab",
    title: "Shore crab",
    attestation: att("Brachyura, whole body in frame", 0.93, 26 * hr),
    xp: 5,
    lat: 38.706,
    lng: -9.163,
    at: BASE - 26 * hr,
  },
  {
    id: "g-3",
    questId: "q-plant",
    species: "ShorePlant",
    title: "Marram grass",
    attestation: att("Ammophila, coastal dune plant", 0.9, 30 * hr),
    xp: 10,
    lat: 38.65,
    lng: -9.32,
    at: BASE - 30 * hr,
  },
  {
    id: "g-4",
    questId: "q-jelly",
    species: "Jellyfish",
    title: "Compass jellyfish",
    attestation: att("Chrysaora hysoscella, bell markings clear", 0.95, 50 * hr),
    xp: 25,
    lat: 38.72,
    lng: -9.48,
    at: BASE - 50 * hr,
  },
];

export const SEED_HISTORY: ActivityEvent[] = [
  { id: "h-1", kind: "quest", title: "Logged a jellyfish sighting", species: "Physalia", xp: 25, attestation: SEED_GALLERY[0].attestation, at: BASE - 2 * hr },
  { id: "h-2", kind: "levelup", title: "Reached Level 3", detail: "Community leaderboard unlocked", at: BASE - 25 * hr },
  { id: "h-3", kind: "quest", title: "Photographed a crab", species: "Crab", xp: 5, attestation: SEED_GALLERY[1].attestation, at: BASE - 26 * hr },
  { id: "h-4", kind: "quest", title: "Photographed a shore plant", species: "ShorePlant", xp: 10, attestation: SEED_GALLERY[2].attestation, at: BASE - 30 * hr },
  { id: "h-5", kind: "verify", title: "Verified with Face (Selfie Check)", detail: "World ID tier 1", at: BASE - 72 * hr },
  { id: "h-6", kind: "join", title: "Joined Nautica", at: BASE - 74 * hr },
];

export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, handle: "tide.eth", xp: 640, level: 6 },
  { rank: 2, handle: "reefwarden", xp: 512, level: 6 },
  { rank: 3, handle: "marisol", xp: 430, level: 5 },
  { rank: 4, handle: "coastwatch", xp: 300, level: 5 },
  { rank: 5, handle: "lena.nautica.eth", xp: 90, level: 3, you: true },
  { rank: 6, handle: "gaivota", xp: 75, level: 3 },
  { rank: 7, handle: "salt", xp: 40, level: 2 },
];
