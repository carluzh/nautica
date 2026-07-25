"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Check, Loader2, MapPin, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { SpeciesBadge } from "@/components/app/species-badge";
import { CATEGORY_META, SPECIES_GROUPS, SPECIES_META } from "@/lib/game/content";
import { cn } from "@/lib/utils";
import type { FilterState } from "./types";

/** Filter tab: search a place (pans the map), toggle the 4 map categories in a 2x2
 *  grid, and refine by species via a searchable, grouped checklist. */
export function TabFilter({ filter }: { filter: FilterState }) {
  const { categories } = filter;
  const allHidden = categories.every((c) => filter.hidden.has(c.category));

  const allSpecies = SPECIES_GROUPS.flatMap((g) => g.species);
  const allSpeciesOn = allSpecies.every((s) => !filter.hiddenSpecies.has(s));

  const [place, setPlace] = useState("");
  const [speciesQuery, setSpeciesQuery] = useState("");

  function onSearch(e: FormEvent) {
    e.preventDefault();
    filter.onSearchPlace(place);
  }

  // Filter the grouped checklist by the species-name query.
  const groups = useMemo(() => {
    const q = speciesQuery.trim().toLowerCase();
    return SPECIES_GROUPS.map((g) => ({
      label: g.label,
      species: q
        ? g.species.filter(
            (s) =>
              SPECIES_META[s].short.toLowerCase().includes(q) ||
              SPECIES_META[s].label.toLowerCase().includes(q) ||
              g.label.toLowerCase().includes(q),
          )
        : g.species,
    })).filter((g) => g.species.length > 0);
  }, [speciesQuery]);

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col">
        {/* Location search — geocodes + pans the map (does not filter markers). */}
        <form onSubmit={onSearch} className="border-b px-3 py-2.5">
          <div className="relative">
            <MapPin className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Search a place… (e.g. Cascais)"
              className="h-8 pr-8 pl-8 text-sm"
              enterKeyHint="search"
            />
            <button
              type="submit"
              aria-label="Search location"
              className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            >
              {filter.searching ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
            </button>
          </div>
        </form>

        {/* Category grid — 2x2, all on by default. */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <span className="text-xs font-medium text-muted-foreground">Categories</span>
          <button
            onClick={allHidden ? filter.onShowAll : filter.onHideAll}
            className="text-[11px] font-medium text-primary transition-opacity hover:opacity-80"
          >
            {allHidden ? "Show all" : "Hide all"}
          </button>
        </div>
        <ul className="grid grid-cols-2 gap-2 px-2 pb-3">
          {categories.map(({ category, count }) => {
            const meta = CATEGORY_META[category];
            const Icon = meta.icon;
            const on = !filter.hidden.has(category);
            return (
              <li key={category}>
                <button
                  onClick={() => filter.onToggle(category)}
                  aria-pressed={on}
                  className={cn(
                    "flex w-full flex-col gap-2 rounded-lg border px-2.5 py-2.5 text-left transition-colors",
                    on ? "bg-background hover:bg-accent/40" : "bg-muted/50",
                  )}
                >
                  <span className="flex w-full items-center justify-between">
                    <span
                      className={cn(
                        "grid size-7 place-items-center rounded-lg transition-[filter] duration-150",
                        on ? "grayscale-0 hover:[filter:grayscale(0.5)]" : "grayscale hover:[filter:grayscale(0.5)]",
                      )}
                      style={{ backgroundColor: `color-mix(in oklch, ${meta.color} 14%, transparent)`, color: meta.color }}
                    >
                      <Icon className="size-4" fill="currentColor" />
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{meta.label}</span>
                    <span className="tnum text-[11px] text-muted-foreground">
                      {count} sighting{count !== 1 ? "s" : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Species checklist — grouped, searchable. */}
        <div className="border-t px-3 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Species</span>
            <button
              onClick={() => filter.onToggleGroup(allSpecies, !allSpeciesOn)}
              className="text-[11px] font-medium text-primary transition-opacity hover:opacity-80"
            >
              {allSpeciesOn ? "None" : "All"}
            </button>
          </div>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={speciesQuery}
              onChange={(e) => setSpeciesQuery(e.target.value)}
              placeholder="Search species…"
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 px-3 pb-4">
          {groups.length === 0 ? (
            <p className="px-1 py-4 text-center text-xs text-muted-foreground">No species match.</p>
          ) : (
            groups.map((group) => {
              return (
                <div key={group.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </span>
                  </div>
                  <ul className="flex flex-col">
                    {group.species.map((s) => {
                      const checked = !filter.hiddenSpecies.has(s);
                      return (
                        <li key={s}>
                          <button
                            onClick={() => filter.onToggleSpecies(s)}
                            aria-pressed={checked}
                            className="flex w-full items-center gap-2.5 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-accent/40"
                          >
                            <span
                              className={cn(
                                "grid size-4 shrink-0 place-items-center rounded border transition-colors",
                                checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
                              )}
                            >
                              {checked ? <Check className="size-3" strokeWidth={3} /> : null}
                            </span>
                            <SpeciesBadge species={s} className="size-5" iconClassName="size-3.5" />
                            <span className="min-w-0 flex-1 truncate text-sm">{SPECIES_META[s].short}</span>
                            <span className="tnum shrink-0 text-[11px] text-muted-foreground">
                              {filter.speciesCounts[s] ?? 0}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
