import type { SpeciesId } from "@/lib/game/types";

export type SpeciesCount = { species: SpeciesId; count: number };

/** Map-marker filter, owned by the Hub and shared with the Filter tab. Covers
 *  both marker layers: the ambient community field and the player's captures. */
export type FilterState = {
  hidden: Set<SpeciesId>;
  /** Species currently plotted on the map, with their total marker counts. */
  counts: SpeciesCount[];
  /** Search by place name (matches the sighting label/title). */
  placeQuery: string;
  onPlaceQuery: (q: string) => void;
  /** Search by species name (matches SPECIES_META[..].short). */
  speciesQuery: string;
  onSpeciesQuery: (q: string) => void;
  onToggle: (species: SpeciesId) => void;
  onShowAll: () => void;
  onHideAll: () => void;
};
