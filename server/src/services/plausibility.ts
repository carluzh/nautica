import { log } from "../lib/logger";
import { getSighting, getSpeciesSightings, type SightingPoint } from "./subgraph";
import { narrate } from "./narration";
import { recognizeSpecies } from "./species-recognition";
import type { GalleryItem, PlausibilityVerdict, SpeciesId } from "../types";

// Plausibility agent. After a sighting is recorded it reads that sighting back
// through the subgraph broker (never the submit closure) and scores whether the
// species was plausibly present at that place/time: a deterministic range + season
// check, corroborated by nearby same-species sightings also read from The Graph.
// Its own service + endpoint; never inlined in submit, never touches 0G.

type Region = { latMin: number; latMax: number; lngMin: number; lngMax: number };

type SpeciesRange = {
  habitat: string;
  absLatMax: number;
  /** Effectively global - skips the native/invasive geo check. */
  cosmopolitan: boolean;
  /** Plausible months (1-12), N-hemisphere reference; flipped by 6 below the equator. */
  months?: number[];
  native?: Region[];
  invasive?: Region[];
};

// Coarse by design: enough to tell "your home coast" from "an ocean away", and to
// surface the invasive-species beat (a lionfish in the NE Atlantic / Mediterranean).
const SPECIES_RANGES: Record<SpeciesId, SpeciesRange> = {
  Physalia: {
    habitat: "warm and temperate open ocean and drift lines",
    absLatMax: 55,
    cosmopolitan: true,
    months: [6, 7, 8, 9, 10, 11], // more frequent on temperate coasts late summer to autumn
  },
  Jellyfish: { habitat: "coastal and open water, worldwide", absLatMax: 78, cosmopolitan: true },
  Crab: { habitat: "intertidal and shallow coasts, worldwide", absLatMax: 72, cosmopolitan: true },
  ShoreFish: { habitat: "shallow coastal water, worldwide", absLatMax: 78, cosmopolitan: true },
  ShorePlant: {
    habitat: "coastal and intertidal vegetation",
    absLatMax: 70,
    cosmopolitan: true,
    months: [3, 4, 5, 6, 7, 8, 9, 10], // temperate growing season
  },
  SeaStar: { habitat: "rocky and sandy sea floor, worldwide", absLatMax: 82, cosmopolitan: true },
  Lionfish: {
    habitat: "warm reefs and rocky structure",
    absLatMax: 42,
    cosmopolitan: false,
    native: [
      { latMin: -35, latMax: 35, lngMin: 30, lngMax: 180 }, // Indo-Pacific
      { latMin: -35, latMax: 35, lngMin: -180, lngMax: -120 }, // central/eastern Pacific
    ],
    invasive: [
      { latMin: 5, latMax: 42, lngMin: -98, lngMax: -40 }, // W Atlantic + Caribbean
      { latMin: 28, latMax: 46, lngMin: -12, lngMax: 36 }, // Mediterranean + NE Atlantic approaches
    ],
  },
  Turtle: {
    habitat: "tropical and temperate seas",
    absLatMax: 45,
    cosmopolitan: false,
    native: [{ latMin: -45, latMax: 45, lngMin: -180, lngMax: 180 }],
  },
  Other: { habitat: "unspecified", absLatMax: 90, cosmopolitan: true },
};

const NEARBY_KM = 200;
const NEARBY_DAYS = 90;

function inRegion(lat: number, lng: number, r: Region): boolean {
  return lat >= r.latMin && lat <= r.latMax && lng >= r.lngMin && lng <= r.lngMax;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function monthOf(at: number, lat: number): number {
  const m = new Date(at).getUTCMonth() + 1; // 1-12
  if (lat >= 0) return m;
  // Southern hemisphere: flip seasons by 6 months so the month list reads correctly.
  return ((m + 5) % 12) + 1;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Pure, deterministic scoring core (no I/O) - the plausibility reasoning. */
export function scoreSighting(
  sighting: { id?: string; species: SpeciesId; lat: number; lng: number; at: number },
  cohort: SightingPoint[],
): PlausibilityVerdict {
  const range = SPECIES_RANGES[sighting.species] ?? SPECIES_RANGES.Other;
  const reasons: string[] = [];
  let score = 1;
  let notable = false;
  let rangeNote: string | undefined;
  let seasonNote: string | undefined;

  // 1. Latitude band.
  if (Math.abs(sighting.lat) > range.absLatMax) {
    score -= 0.5;
    reasons.push(`Latitude ${sighting.lat.toFixed(1)}° is beyond the plausible band for ${sighting.species}.`);
  }

  // 2. Native / invasive geography (skipped for cosmopolitan taxa).
  if (!range.cosmopolitan) {
    const native = (range.native ?? []).some((r) => inRegion(sighting.lat, sighting.lng, r));
    const invasive = (range.invasive ?? []).some((r) => inRegion(sighting.lat, sighting.lng, r));
    if (native) {
      rangeNote = `Within the native range (${range.habitat}).`;
    } else if (invasive) {
      notable = true;
      rangeNote = `Outside the native range but an established invasive population occurs here - notable.`;
      reasons.push(`${sighting.species} is invasive in this region; a valid but noteworthy record.`);
    } else {
      score -= 0.4;
      rangeNote = `Far outside the known range for ${sighting.species}.`;
      reasons.push(`No native or invasive ${sighting.species} population is known near this location.`);
    }
  }

  // 3. Season / month.
  if (range.months && range.months.length > 0) {
    const m = monthOf(sighting.at, sighting.lat);
    if (!range.months.includes(m)) {
      score -= 0.25;
      seasonNote = `Month ${m} is outside the usual season for ${sighting.species}.`;
      reasons.push(seasonNote);
    } else {
      seasonNote = `In season (month ${m}).`;
    }
  }

  // 4. Community corroboration from The Graph: nearby same-species sightings.
  let corroboratingNearby = 0;
  for (const p of cohort) {
    if (p.id === sighting.id) continue;
    const withinTime = Math.abs(p.at - sighting.at) <= NEARBY_DAYS * 86400 * 1000;
    if (!withinTime) continue;
    if (haversineKm(sighting.lat, sighting.lng, p.lat, p.lng) <= NEARBY_KM) corroboratingNearby += 1;
  }
  if (corroboratingNearby >= 3) {
    score += 0.15;
    reasons.push(`${corroboratingNearby} nearby ${sighting.species} sightings corroborate this one.`);
  }

  score = clamp01(score);
  const verdict: PlausibilityVerdict["verdict"] =
    score >= 0.75 ? "plausible" : score >= 0.4 ? "unusual" : "implausible";
  if (reasons.length === 0) reasons.push(`Consistent with the known range and season for ${sighting.species}.`);

  return {
    sightingId: sighting.id ?? "",
    species: sighting.species,
    verdict,
    score: Math.round(score * 100) / 100,
    notable: notable || undefined,
    reasons,
    rangeNote,
    seasonNote,
    corroboratingNearby,
    at: Date.now(),
  };
}

/**
 * Read the sighting (and its species cohort) back from The Graph via the broker,
 * then score it. Returns null when the sighting isn't visible to this user (unknown
 * id, or another player's record). Honors the broker's mock->real swap automatically.
 */
export async function assessSighting(userId: string, sightingId: string): Promise<PlausibilityVerdict | null> {
  const sighting: GalleryItem | null = await getSighting(userId, sightingId);
  if (!sighting) return null;

  const cohort = await getSpeciesSightings(sighting.species).catch((err) => {
    log.error("plausibility: cohort fetch failed", { err: String(err) });
    return [] as SightingPoint[];
  });

  const verdict = scoreSighting(
    { id: sighting.id, species: sighting.species, lat: sighting.lat, lng: sighting.lng, at: sighting.at },
    cohort,
  );
  verdict.sightingId = sighting.id;

  // Independent second-model species recognition (mock; non-gating cross-check).
  verdict.recognition = recognizeSpecies(sighting.species, sighting.id);

  // Optional LLM narration over the deterministic verdict (no-op unless enabled).
  verdict.narrative = await narrate(verdict, sighting);
  return verdict;
}
