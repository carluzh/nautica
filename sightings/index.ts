import type { Sighting } from "@/lib/game/types";
import data from "./sightings.real.json";

// Real community sightings from iNaturalist (Lisbon coast + Mallorca),
// prebuilt and committed (see ./pull-sightings.ts); no runtime API calls.
export const REAL_SIGHTINGS = data as Sighting[];
