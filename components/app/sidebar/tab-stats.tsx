"use client";

import { SpeciesBadge } from "@/components/app/species-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SPECIES_META } from "@/lib/game/content";
import { COMMUNITY_STATS } from "@/lib/game/mock";

const BLOCKS = [
  { value: COMMUNITY_STATS.counts, label: "Counts logged" },
  { value: COMMUNITY_STATS.scientists, label: "Citizen scientists" },
  { value: COMMUNITY_STATS.sightings, label: "Marine sightings" },
] as const;

/** Stats tab: aggregate community "Total stats" season board (not per-player). */
export function TabStats() {
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-5 p-4">
        {/* Season header */}
        <p className="text-xs font-medium text-muted-foreground">
          Total stats · {COMMUNITY_STATS.year}
        </p>

        {/* Big-number totals */}
        <div className="divide-y rounded-lg border">
          {BLOCKS.map((b) => (
            <div key={b.label} className="px-4 py-3">
              <p className="tnum text-2xl font-semibold leading-none">
                {b.value.toLocaleString()}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">{b.label}</p>
            </div>
          ))}
        </div>

        {/* Top 5 species */}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Top 5 species · {COMMUNITY_STATS.year}
          </p>
          <ul className="flex flex-col gap-1.5">
            {COMMUNITY_STATS.topSpecies.map((s, i) => (
              <li
                key={s.species}
                className="flex items-center gap-3 rounded-lg border px-2.5 py-2"
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
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ScrollArea>
  );
}
