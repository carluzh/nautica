"use client";

import { useMemo } from "react";
import { SpeciesBadge } from "@/components/app/species-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SPECIES_META } from "@/lib/game/content";
import { useGame } from "@/lib/game/provider";
import type { SpeciesId } from "@/lib/game/types";

/** Stats tab: the community "Total stats" board, computed live from the real
 *  sightings store (iNaturalist seed + newly logged captures), not per-player. */
export function TabStats({ onFocusSpecies }: { onFocusSpecies: (s: SpeciesId) => void }) {
  const { sightings } = useGame();

  const { total, observers, top } = useMemo(() => {
    const counts = Object.fromEntries(
      (Object.keys(SPECIES_META) as SpeciesId[]).map((s) => [s, 0]),
    ) as Record<SpeciesId, number>;
    const obs = new Set<string>();
    for (const s of sightings) {
      counts[s.species] += 1;
      // Attribution reads "© observer · iNaturalist · LICENSE" - pull the observer.
      const m = s.attribution?.match(/©\s*([^·]+?)\s*·/);
      if (m) obs.add(m[1].trim());
    }
    const top = (Object.keys(counts) as SpeciesId[])
      .map((species) => ({ species, count: counts[species] }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);
    return { total: sightings.length, observers: obs.size, top };
  }, [sightings]);

  const pills = [
    { value: observers, label: "Citizen scientists" },
    { value: total, label: "Marine sightings" },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-5 p-4">
        {/* Season header */}
        <p className="text-xs font-medium text-muted-foreground">Total stats</p>

        {/* Big-number totals - two side-by-side pills */}
        <div className="flex gap-3">
          {pills.map((p) => (
            <div key={p.label} className="flex-1 rounded-xl bg-muted/50 px-4 py-3">
              <p className="tnum text-2xl font-bold leading-none">{p.value.toLocaleString()}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">{p.label}</p>
            </div>
          ))}
        </div>

        {/* Most sighted species - live counts */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Most sighted species</p>
          <ul className="flex flex-col gap-1.5">
            {top.map((s, i) => (
              <li key={s.species}>
                <button
                  type="button"
                  onClick={() => onFocusSpecies(s.species)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/60"
                >
                  <span className="tnum w-4 shrink-0 text-center text-xs font-medium text-muted-foreground">
                    {i + 1}
                  </span>
                  <SpeciesBadge species={s.species} className="size-7" />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {SPECIES_META[s.species].short}
                  </span>
                  <span className="tnum shrink-0 text-sm font-medium">
                    {s.count.toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ScrollArea>
  );
}
