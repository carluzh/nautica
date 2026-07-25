"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Gauge, SlidersHorizontal, Trophy, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SPECIES_META } from "@/lib/game/content";
import { REAL_SIGHTINGS } from "@/sightings";
import { useGame } from "@/lib/game/provider";
import { cn } from "@/lib/utils";
import { TabActivities } from "./tab-activities";
import { TabFilter } from "./tab-filter";
import { TabStats } from "./tab-stats";
import { TabLeaderboard } from "./tab-leaderboard";
import type { FilterState } from "./types";
import type { SpeciesId } from "@/lib/game/types";

type TabId = "filter" | "activities" | "stats" | "leaderboard";

const TABS: { id: TabId; icon: LucideIcon; label: string }[] = [
  { id: "filter", icon: SlidersHorizontal, label: "Filter" },
  { id: "activities", icon: Activity, label: "Activities" },
  { id: "stats", icon: Gauge, label: "Stats" },
  { id: "leaderboard", icon: Trophy, label: "Divers" },
];

/**
 * The left column: logo, a 4-category tab row, and the active category's content
 * below. Activities is the default. The level / streak / quick-actions / profile
 * HUD floats top-right over the map instead (see map-hud). Rendered as a fixed
 * column on lg+ and inside a slide-in overlay on smaller screens (see game-hub).
 */
export function Sidebar({
  filter,
  onClose,
  className,
}: {
  filter: FilterState;
  onClose?: () => void;
  className?: string;
}) {
  const [tab, setTab] = useState<TabId>("filter");

  const handleFocusSpecies = (species: SpeciesId) => {
    setTab("filter");
    filter.onSoloSpecies(species);
  };

  return (
    <aside className={cn("flex h-full w-full flex-col bg-sidebar", className)}>
      {/* Header: logo (+ sighting polaroids). */}
      <div className="flex items-center gap-2 px-4 py-5">
        <Link
          href="/"
          className="inline-flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80"
        >
          {/* Brand mark (public/logo.png) tinted coral via CSS mask — logo.png
              carries alpha, so only the mark itself takes the fill. */}
          <span
            role="img"
            aria-label="nautica"
            className="size-9 shrink-0"
            style={{
              backgroundColor: "#FF6F61",
              maskImage: "url(/logo.png)",
              WebkitMaskImage: "url(/logo.png)",
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskPosition: "center",
            }}
          />
          <span className="relative top-[-2px] truncate text-2xl font-bold tracking-tight">nautica</span>
        </Link>

        <HeaderPolaroids onClose={onClose} />

        {onClose ? (
          <Button variant="ghost" size="icon-sm" onClick={onClose} className="shrink-0 lg:hidden">
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      {/* Category tabs (no divider below — only the header border above is kept) */}
      <div className="grid grid-cols-4 gap-1 p-2">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-pressed={active}
              className={cn(
                "flex items-center justify-center gap-1.5 min-w-0 rounded-lg px-1 py-2 text-[11px] font-semibold transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
              )}
            >
              <t.icon className="size-4 shrink-0" />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active category content */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "filter" ? <TabFilter filter={filter} /> : null}
        {tab === "activities" ? <TabActivities /> : null}
        {tab === "stats" ? <TabStats onFocusSpecies={handleFocusSpecies} /> : null}
        {tab === "leaderboard" ? <TabLeaderboard /> : null}
      </div>
    </aside>
  );
}

// Community sightings that carry a (CC-licensed) photo — the pool the header
// polaroids draw from.
const PHOTO_SIGHTINGS = REAL_SIGHTINGS.filter((s) => Boolean(s.photo));

/** Three small tilted polaroids of real sightings, right-aligned in the sidebar
 *  header. Shows 3 random CC-licensed photos; clicking flies the map to that spot. */
function HeaderPolaroids({ onClose }: { onClose?: () => void }) {
  const { focusSighting } = useGame();
  const tilts = ["-rotate-6", "rotate-3", "-rotate-4"];

  // Deterministic first-3 on the server, then a random 3 on the client — picking
  // with Math.random() only after mount avoids an SSR hydration mismatch.
  const [shots, setShots] = useState(() => PHOTO_SIGHTINGS.slice(0, 3));
  useEffect(() => {
    setShots([...PHOTO_SIGHTINGS].sort(() => Math.random() - 0.5).slice(0, 3));
  }, []);

  if (shots.length === 0) return null;

  return (
    <div className="ml-auto flex shrink-0 items-center gap-1">
      {shots.map((s, i) => {
        const title = s.label ?? SPECIES_META[s.species].short;
        return (
          <button
            key={s.id}
            type="button"
            title={title}
            onClick={() => {
              focusSighting({
                lng: s.lng,
                lat: s.lat,
                species: s.species,
                title,
                place: s.label,
                photo: s.photo,
                attribution: s.attribution,
              });
              onClose?.();
            }}
            className={cn(
              "relative block rounded-[3px] border border-border bg-background p-1 pb-3 transition-transform hover:z-10 hover:rotate-0 hover:scale-110",
              tilts[i % tilts.length],
            )}
          >
            <span className="block size-8 overflow-hidden rounded-[2px] bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.photo}
                alt={title}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="size-full object-cover"
              />
            </span>
            {/* Caption texture — three tiny dots in the bottom strip. */}
            <span className="absolute inset-x-0 bottom-[5px] flex items-center justify-center gap-[2px]">
              {[0, 1, 2].map((d) => (
                <span key={d} className="size-[3px] rounded-full bg-[#4a473f] opacity-75" />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
