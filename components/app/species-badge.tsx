import { CATEGORY_META, mapIcon, SPECIES_META } from "@/lib/game/content";
import type { SpeciesId } from "@/lib/game/types";
import { cn } from "@/lib/utils";

// Color comes from the species' map category (to match the map); icon from the
// consolidated `mapIcon` set. Size the container via `className`, the icon via `iconClassName`.
export function SpeciesBadge({
  species,
  className,
  iconClassName,
}: {
  species: SpeciesId;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = mapIcon(species);
  const color = CATEGORY_META[SPECIES_META[species].category].color;
  return (
    <span className={cn("flex shrink-0 items-center justify-center", className)}>
      <Icon className={cn("size-4", iconClassName)} fill="currentColor" style={{ color }} />
    </span>
  );
}
