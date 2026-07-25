import { mapIcon, RISK_META, SPECIES_META } from "@/lib/game/content";
import type { SpeciesId } from "@/lib/game/types";
import { cn } from "@/lib/utils";

/**
 * The one species chip used across the app: a clean, filled species icon in its
 * risk color, on a transparent container (no background tile). Color = risk class
 * (matches the map), icon = the consolidated 4-glyph `mapIcon` set. Size the outer
 * container via `className`, the icon via `iconClassName` (default size-4).
 */
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
  const color = RISK_META[SPECIES_META[species].risk].color;
  return (
    <span className={cn("flex shrink-0 items-center justify-center", className)}>
      <Icon className={cn("size-4", iconClassName)} fill="currentColor" style={{ color }} />
    </span>
  );
}
