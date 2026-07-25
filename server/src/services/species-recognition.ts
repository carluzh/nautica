import type { SpeciesId, SpeciesRecognition } from "../types";

// Mock of an open-source species-recognition model (iNaturalist-style CV) that runs as
// an INDEPENDENT second signal alongside 0G's TEE classification - defence in depth for
// the "verify before payout" story. The real version would POST the photo to the model's
// inference API; here we synthesise a stable, believable prediction from the recorded
// species so the demo shows the multi-signal verification. Deterministic per sighting id
// (a re-fetch never changes the number), and strictly NON-GATING: informational only.

type Info = { sci: string; common: string; alts: [string, string] };

const SPECIES: Record<SpeciesId, Info> = {
  Physalia: { sci: "Physalia physalis", common: "Portuguese man o' war", alts: ["Velella velella", "Chrysaora hysoscella"] },
  Jellyfish: { sci: "Chrysaora hysoscella", common: "Compass jellyfish", alts: ["Aurelia aurita", "Rhizostoma pulmo"] },
  Crab: { sci: "Carcinus maenas", common: "European shore crab", alts: ["Pachygrapsus marmoratus", "Necora puber"] },
  ShoreFish: { sci: "Gobius paganellus", common: "Rock goby", alts: ["Lipophrys pholis", "Symphodus melops"] },
  ShorePlant: { sci: "Ammophila arenaria", common: "Marram grass", alts: ["Cakile maritima", "Eryngium maritimum"] },
  SeaStar: { sci: "Asterias rubens", common: "Common starfish", alts: ["Marthasterias glacialis", "Echinaster sepositus"] },
  Lionfish: { sci: "Pterois volitans", common: "Red lionfish", alts: ["Pterois miles", "Scorpaena maderensis"] },
  Turtle: { sci: "Caretta caretta", common: "Loggerhead sea turtle", alts: ["Chelonia mydas", "Dermochelys coriacea"] },
  Other: { sci: "Indeterminate", common: "Unresolved", alts: ["", ""] },
};

// Stable FNV-1a hash of the sighting id -> [0,1). Keeps the mocked confidence fixed
// per sighting across refetches (Math.random would flicker the number on each read).
function unit(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export function recognizeSpecies(species: SpeciesId, sightingId: string): SpeciesRecognition {
  const info = SPECIES[species] ?? SPECIES.Other;
  const u = unit(sightingId);
  if (species === "Other") {
    return {
      model: "iNaturalist",
      label: "Indeterminate",
      confidence: Math.round((0.42 + u * 0.2) * 100) / 100,
      agrees: false,
    };
  }
  // Known species: a confident, believable match (0.85–0.98) plus two runner-ups.
  const confidence = Math.round((0.85 + u * 0.13) * 100) / 100;
  const a1 = Math.round(Math.max(0.02, (1 - confidence) * (0.55 + u * 0.3)) * 100) / 100;
  const a2 = Math.round(Math.max(0.01, a1 * (0.4 + u * 0.3)) * 100) / 100;
  return {
    model: "iNaturalist",
    label: info.sci,
    commonName: info.common,
    confidence,
    agrees: confidence >= 0.6,
    alternatives: [
      { label: info.alts[0], confidence: a1 },
      { label: info.alts[1], confidence: a2 },
    ],
  };
}
