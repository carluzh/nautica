import type {
  ActivityEvent,
  Attestation,
  GalleryItem,
  LeaderboardEntry,
  Sighting,
  SpeciesId,
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

/**
 * Ambient community sightings along the Lisbon–Cascais–Sintra coast. Rendered on
 * the app map as a static, read-only field so it looks like a live survey (even
 * before login). Composed on purpose: a few TIGHT CLUSTERS (hotspots — a jelly
 * bloom, a survey stretch) plus scattered SINGLETONS. Coordinates are approximate
 * coastal/water points — tune freely; this is presentation data, not game state.
 */
export const SEED_SIGHTINGS: Sighting[] = [
  // ── Cluster A · Cascais bay — a Physalia/jelly wash-up (hazard hotspot) ──
  { id: "s-a1", species: "Physalia", lng: -9.418, lat: 38.686, label: "Physalia · Cascais bay" },
  { id: "s-a2", species: "Jellyfish", lng: -9.424, lat: 38.685, label: "Jellyfish · Cascais bay" },
  { id: "s-a3", species: "Physalia", lng: -9.412, lat: 38.6875, label: "Physalia · Cascais bay" },
  { id: "s-a4", species: "Jellyfish", lng: -9.43, lat: 38.6835, label: "Jellyfish · Cascais bay" },
  { id: "s-a5", species: "Jellyfish", lng: -9.408, lat: 38.689, label: "Jellyfish · Cascais bay" },

  // ── Cluster B · Guincho / Cabo da Roca — rocky-shore mix (west-facing, water west) ──
  { id: "s-b1", species: "ShoreFish", lng: -9.485, lat: 38.7325, label: "Shore fish · Guincho" },
  { id: "s-b2", species: "SeaStar", lng: -9.49, lat: 38.737, label: "Sea star · Guincho" },
  { id: "s-b3", species: "Crab", lng: -9.487, lat: 38.7405, label: "Crab · Guincho" },
  { id: "s-b4", species: "ShorePlant", lng: -9.483, lat: 38.729, label: "Shore plant · Guincho" },

  // ── Cluster C · Costa da Caparica (north) — intertidal survey stretch (water west) ──
  { id: "s-c1", species: "Crab", lng: -9.247, lat: 38.6525, label: "Crab · Costa da Caparica" },
  { id: "s-c2", species: "ShorePlant", lng: -9.25, lat: 38.649, label: "Shore plant · Costa da Caparica" },
  { id: "s-c3", species: "Crab", lng: -9.248, lat: 38.6455, label: "Crab · Costa da Caparica" },
  { id: "s-c4", species: "ShoreFish", lng: -9.245, lat: 38.656, label: "Shore fish · Costa da Caparica" },
  { id: "s-c5", species: "SeaStar", lng: -9.251, lat: 38.651, label: "Sea star · Costa da Caparica" },

  // ── Cluster D · Carcavelos / Oeiras — small group (south-facing, water south) ──
  { id: "s-d1", species: "ShoreFish", lng: -9.329, lat: 38.669, label: "Shore fish · Carcavelos" },
  { id: "s-d2", species: "Turtle", lng: -9.324, lat: 38.6675, label: "Sea turtle · Carcavelos" },
  { id: "s-d3", species: "Crab", lng: -9.333, lat: 38.6665, label: "Crab · Carcavelos" },

  // ── Singletons · scattered down the coast ──
  { id: "s-e1", species: "Physalia", lng: -9.398, lat: 38.6855, label: "Physalia · Estoril" },
  { id: "s-e2", species: "ShoreFish", lng: -9.295, lat: 38.668, label: "Shore fish · Paço de Arcos" },
  { id: "s-e3", species: "Other", lng: -9.205, lat: 38.665, label: "Unidentified · Tagus mouth" },
  { id: "s-e4", species: "ShorePlant", lng: -9.26, lat: 38.66, label: "Shore plant · Trafaria" },
  { id: "s-e5", species: "Jellyfish", lng: -9.245, lat: 38.61, label: "Jellyfish · Caparica" },
  { id: "s-e6", species: "Crab", lng: -9.22, lat: 38.57, label: "Crab · Fonte da Telha" },
  { id: "s-e7", species: "Turtle", lng: -9.105, lat: 38.435, label: "Sea turtle · Sesimbra" },
  { id: "s-e8", species: "SeaStar", lng: -9.225, lat: 38.41, label: "Sea star · Cabo Espichel" },
  { id: "s-e9", species: "ShoreFish", lng: -9.478, lat: 38.8135, label: "Shore fish · Praia Grande" },
  { id: "s-e10", species: "Lionfish", lng: -9.46, lat: 38.66, label: "Lionfish · open water" },
];

export const SEED_HISTORY: ActivityEvent[] = [
  { id: "h-1", kind: "quest", title: "Logged a jellyfish sighting", species: "Physalia", xp: 25, attestation: SEED_GALLERY[0].attestation, lng: -9.421, lat: 38.694, at: BASE - 2 * hr },
  { id: "h-7", kind: "quest", title: "Photographed a shore fish", species: "ShoreFish", xp: 5, attestation: att("Shore fish, whole body in frame", 0.94, 5 * hr), lng: -9.329, lat: 38.669, at: BASE - 5 * hr },
  { id: "h-8", kind: "quest", title: "Logged a sea turtle", species: "Turtle", xp: 25, attestation: att("Sea turtle, carapace visible", 0.96, 9 * hr), lng: -9.324, lat: 38.6675, at: BASE - 9 * hr },
  { id: "h-2", kind: "levelup", title: "Reached Level 3", detail: "Community leaderboard unlocked", at: BASE - 25 * hr },
  { id: "h-3", kind: "quest", title: "Photographed a crab", species: "Crab", xp: 5, attestation: SEED_GALLERY[1].attestation, lng: -9.163, lat: 38.706, at: BASE - 26 * hr },
  { id: "h-9", kind: "quest", title: "Logged a compass jellyfish", species: "Jellyfish", xp: 25, attestation: att("Chrysaora hysoscella, bell markings clear", 0.95, 28 * hr), lng: -9.245, lat: 38.61, at: BASE - 28 * hr },
  { id: "h-4", kind: "quest", title: "Photographed a shore plant", species: "ShorePlant", xp: 10, attestation: SEED_GALLERY[2].attestation, lng: -9.32, lat: 38.65, at: BASE - 30 * hr },
  { id: "h-10", kind: "quest", title: "Spotted a sea star", species: "SeaStar", xp: 10, attestation: att("Sea star, five arms intact", 0.92, 44 * hr), lng: -9.225, lat: 38.41, at: BASE - 44 * hr },
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

/**
 * Aggregate community totals for the current season — illustrative seed data
 * for the "Total stats" board (citizen-science style, not per-player).
 */
export const COMMUNITY_STATS = {
  year: 2026,
  counts: 76021,        // observations logged
  scientists: 55297,    // verified contributors
  sightings: 830910,    // individual animals & plants recorded
  topSpecies: [
    { species: "Jellyfish", count: 166698 },
    { species: "Physalia", count: 127584 },
    { species: "Crab", count: 108360 },
    { species: "ShoreFish", count: 98518 },
    { species: "SeaStar", count: 79787 },
    { species: "ShorePlant", count: 62140 },
    { species: "Turtle", count: 41205 },
    { species: "Lionfish", count: 23068 },
    { species: "Other", count: 15412 },
  ] as { species: SpeciesId; count: number }[],
};
