import type {
  ActivityEvent,
  Attestation,
  GalleryItem,
  LeaderboardEntry,
  UserState,
} from "./types";

// Fixed base timestamp (never Date.now at module scope - keeps SSR deterministic).
// Kept recent (≈ the demo date) so timeAgo and the time-period filter read sensibly.
const BASE = 1_784_836_000_000;
const min = 60_000;
const hr = 60 * min;

export const INITIAL_USER: UserState = {
  connected: false,
  handle: "",
  wallet: null,
  xp: 0,
  streak: 0,
  verification: { face: false, passport: false, orb: false },
  balanceUsd: 0,
};

/** A returning player, seeded when they sign in with World ID (demo-friendly). */
export const RETURNING_USER: Partial<UserState> = {
  connected: true,
  handle: "lena.nautica.eth",
  wallet: null, // World ID / Google sign-in has no wallet; set later in Settings
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
    simulated: false,
    teeVerified: true,
    attestationSource: "0g-router:verify_tee",
    provider: "0x4415ef5CBb415347bb18493af7cE01f225Fc0868",
    verifiability: "TeeTLS",
    teeSigner: "0x03716ddFbA77600C33b605FABD2F70Fe89856b0d",
    providerVerifiability: "TeeML",
    providerAcknowledged: true,
    quoteVerified: true,
    quoteVerifier: "automata-onchain",
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
  { id: "h-1", kind: "quest", title: "Logged a jellyfish sighting", species: "Physalia", xp: 25, attestation: SEED_GALLERY[0].attestation, lng: -9.421, lat: 38.694, at: BASE - 2 * hr },
  { id: "h-7", kind: "quest", title: "Photographed a shore fish", species: "ShoreFish", xp: 5, attestation: att("Shore fish, whole body in frame", 0.94, 5 * hr), lng: -9.329, lat: 38.669, at: BASE - 5 * hr },
  { id: "h-8", kind: "quest", title: "Logged a sea turtle", species: "Turtle", xp: 25, attestation: att("Sea turtle, carapace visible", 0.96, 9 * hr), lng: -9.324, lat: 38.6675, at: BASE - 9 * hr },
  { id: "h-2", kind: "levelup", title: "Reached Level 3", detail: "Community leaderboard unlocked", at: BASE - 25 * hr },
  { id: "h-3", kind: "quest", title: "Photographed a crab", species: "Crab", xp: 5, attestation: SEED_GALLERY[1].attestation, lng: -9.163, lat: 38.706, at: BASE - 26 * hr },
  { id: "h-9", kind: "quest", title: "Logged a compass jellyfish", species: "Jellyfish", xp: 25, attestation: att("Chrysaora hysoscella, bell markings clear", 0.95, 28 * hr), lng: -9.245, lat: 38.61, at: BASE - 28 * hr },
  { id: "h-4", kind: "quest", title: "Photographed a shore plant", species: "ShorePlant", xp: 10, attestation: SEED_GALLERY[2].attestation, lng: -9.32, lat: 38.65, at: BASE - 30 * hr },
  { id: "h-10", kind: "quest", title: "Spotted a starfish", species: "SeaStar", xp: 10, attestation: att("Starfish, five arms intact", 0.92, 44 * hr), lng: -9.225, lat: 38.41, at: BASE - 44 * hr },
  { id: "h-11", kind: "quest", title: "Photographed a shore crab", species: "Crab", xp: 5, attestation: att("Brachyura, whole body in frame", 0.91, 50 * hr), lng: -9.22, lat: 38.57, at: BASE - 50 * hr },
  { id: "h-5", kind: "verify", title: "Verified with Face (Selfie Check)", detail: "World ID tier 1", at: BASE - 72 * hr },
  { id: "h-6", kind: "join", title: "Joined Nautica", at: BASE - 74 * hr },
];

export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, handle: "tide.eth", xp: 640, level: 6, earnings: 342 },
  { rank: 2, handle: "reefwarden", xp: 512, level: 6, earnings: 310 },
  { rank: 3, handle: "marisol", xp: 430, level: 5, earnings: 228 },
  { rank: 4, handle: "coastwatch", xp: 300, level: 5, earnings: 176 },
  { rank: 5, handle: "lena.nautica.eth", xp: 90, level: 3, you: true, earnings: 54 },
  { rank: 6, handle: "gaivota", xp: 75, level: 3, earnings: 47 },
  { rank: 7, handle: "salt", xp: 40, level: 2, earnings: 31 },
  { rank: 8, handle: "kelp.eth", xp: 34, level: 2, earnings: 22 },
  { rank: 9, handle: "nerio", xp: 28, level: 2, earnings: 14 },
  { rank: 10, handle: "dorsal", xp: 22, level: 2, earnings: 9 },
  { rank: 11, handle: "finn.eth", xp: 15, level: 1, earnings: 6 },
  { rank: 12, handle: "brackish", xp: 10, level: 1, earnings: 3 },
  { rank: 13, handle: "lowtide", xp: 6, level: 1, earnings: 0 },
  { rank: 14, handle: "spume", xp: 3, level: 1, earnings: 0 },
];
