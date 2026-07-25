import type { Sighting } from "@/lib/game/types";
import data from "./sightings.real.json";

/**
 * Real historical community sightings pulled from iNaturalist (Lisbon coast +
 * Mallorca) — replaces the faked SEED_SIGHTINGS the map used to render. Prebuilt
 * and committed (see ./pull-sightings.ts); no client/runtime API calls.
 */
export const REAL_SIGHTINGS = data as Sighting[];
