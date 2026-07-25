import type { Category } from "@/lib/game/content";
import type { SpeciesId } from "@/lib/game/types";

export type CategoryCount = { category: Category; count: number };

/** Map-marker filter, owned by the Hub and shared with the Filter tab. Two
 *  independent dimensions, both default to "everything visible":
 *   • category (Marine life / Invasive / Hazards / Rare findings) — a 2x2 grid;
 *   • species — a searchable, grouped checklist.
 *  A marker shows only if its category AND its species are both enabled.
 *  Location search does NOT filter — it geocodes and flies the map there. */
export type FilterState = {
  // Category grid
  hidden: Set<Category>;
  categories: CategoryCount[];
  onToggle: (category: Category) => void;
  onShowAll: () => void;
  onHideAll: () => void;

  // Species checklist
  hiddenSpecies: Set<SpeciesId>;
  speciesCounts: Record<SpeciesId, number>;
  onToggleSpecies: (species: SpeciesId) => void;
  /** Set a whole group's species visible (true) or hidden (false). */
  onToggleGroup: (species: SpeciesId[], visible: boolean) => void;
  /** Solo one species in the Filter tab: hide every other species, show all categories. */
  onSoloSpecies: (species: SpeciesId) => void;

  // Location search — geocodes the query and pans the map (no filtering).
  onSearchPlace: (query: string) => void;
  searching: boolean;
};
