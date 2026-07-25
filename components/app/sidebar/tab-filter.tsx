"use client";

import { AlertTriangle, Eye, EyeOff, MapPin, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { SPECIES_META } from "@/lib/game/content";
import { SpeciesBadge } from "@/components/app/species-badge";
import { cn } from "@/lib/utils";
import type { FilterState } from "./types";

/** Filter tab: search + toggle which species show as markers on the map (both the
 *  ambient community field and your own captures). Search narrows by place + species. */
export function TabFilter({ filter }: { filter: FilterState }) {
  const { counts } = filter;
  const allHidden = counts.length > 0 && counts.every((c) => filter.hidden.has(c.species));
  const hasQuery = filter.placeQuery.trim().length > 0 || filter.speciesQuery.trim().length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Search — two fields (place AND species) narrow both the list and map markers. */}
      <div className="space-y-2 border-b px-3 py-2">
        <div className="relative">
          <MapPin className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter.placeQuery}
            onChange={(e) => filter.onPlaceQuery(e.target.value)}
            placeholder="Search place…"
            className="h-8 pl-8 text-sm"
          />
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter.speciesQuery}
            onChange={(e) => filter.onSpeciesQuery(e.target.value)}
            placeholder="Search species…"
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {counts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <div className="flex size-10 items-center justify-center rounded-full border bg-muted">
            <MapPin className="size-4 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">{hasQuery ? "No matches" : "Nothing to filter yet"}</p>
          <p className="text-xs text-muted-foreground">
            {hasQuery
              ? "No species or places match your search."
              : "Sightings show up here as map filters once the field has data."}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Show on map</span>
            <button
              onClick={allHidden ? filter.onShowAll : filter.onHideAll}
              className="text-[11px] font-medium text-primary transition-opacity hover:opacity-80"
            >
              {allHidden ? "Show all" : "Hide all"}
            </button>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <ul className="grid grid-cols-2 gap-2 p-2">
              {counts.map(({ species, count }) => {
                const meta = SPECIES_META[species];
                const on = !filter.hidden.has(species);
                return (
                  <li key={species}>
                    <button
                      onClick={() => filter.onToggle(species)}
                      aria-pressed={on}
                      className={cn(
                        "flex w-full flex-col items-start gap-1 rounded-lg border px-2.5 py-2 text-left transition-colors",
                        on
                          ? "bg-background hover:bg-accent/40"
                          : "border-dashed bg-muted/30 opacity-60 hover:opacity-90",
                      )}
                    >
                      <span className="flex w-full items-center justify-between">
                        <SpeciesBadge species={species} className="size-6" iconClassName="size-4" />
                        {on ? (
                          <Eye className="size-3.5 shrink-0 text-primary" />
                        ) : (
                          <EyeOff className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </span>
                      <span className="flex w-full min-w-0 items-center gap-1 text-sm font-medium">
                        <span className="truncate">{meta.short}</span>
                        {meta.hazard ? <AlertTriangle className="size-3 shrink-0 text-warning" /> : null}
                      </span>
                      <span className="tnum text-[11px] text-muted-foreground">
                        {count} sighting{count !== 1 ? "s" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
