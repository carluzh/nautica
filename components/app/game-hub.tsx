"use client";

import { createElement, useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Menu } from "lucide-react";
import { SeaMap, type SeaMarker } from "@/components/map/sea-map";
import { Button } from "@/components/ui/button";
import { RISK_META, SPECIES_META, mapIcon, type RiskClass } from "@/lib/game/content";
import { SEED_SIGHTINGS } from "@/lib/game/mock";
import type { SpeciesId } from "@/lib/game/types";
import { GameProvider, useGame } from "@/lib/game/provider";
import { Sidebar } from "./sidebar/sidebar";
import { MapHud } from "./map-hud";
import type { FilterState } from "./sidebar/types";
import { LoginGate } from "./login-gate";
import { LevelUpOverlay } from "./level-up-overlay";
import { MissionsBoard } from "./panels/missions-board";
import { QuestSubmitDialog } from "./panels/quest-submit-dialog";
import { ProfileDialog } from "./panels/profile-dialog";
import { GalleryDialog } from "./panels/gallery-dialog";
import { SettingsDialog } from "./panels/settings-dialog";
import { PaymentsDialog } from "./panels/payments-dialog";

// Pre-render each species' Lucide icon to an SVG string once. The imperative map
// markers embed this; `currentColor` lets each pin tint the icon by risk class.
const ICON_SVG = Object.fromEntries(
  (Object.keys(SPECIES_META) as SpeciesId[]).map((id) => [
    id,
    renderToStaticMarkup(
      createElement(mapIcon(id), { width: 15, height: 15, strokeWidth: 2, fill: "currentColor" }),
    ),
  ]),
) as Record<SpeciesId, string>;

/** Marker color = risk (glanceable); icon = species; tooltip = species + place. */
function toMarker(species: SpeciesId): Pick<SeaMarker, "color" | "icon"> {
  return { color: RISK_META[SPECIES_META[species].risk].color, icon: ICON_SVG[species] };
}

function Hub() {
  const { gallery, setOpenPanel, user } = useGame();
  const [hidden, setHidden] = useState<Set<SpeciesId>>(new Set());
  const [placeQuery, setPlaceQuery] = useState("");
  const [speciesQuery, setSpeciesQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  // A sighting matches when its place text (community `label` / capture `title`)
  // contains the place query AND its species name contains the species query
  // (case-insensitive; an empty field matches everything — AND semantics).
  const matches = useMemo(() => {
    const p = placeQuery.trim().toLowerCase();
    const s = speciesQuery.trim().toLowerCase();
    return (species: SpeciesId, text?: string) => {
      const place = (text ?? "").toLowerCase();
      const name = SPECIES_META[species].short.toLowerCase();
      return (!p || place.includes(p)) && (!s || name.includes(s));
    };
  }, [placeQuery, speciesQuery]);

  // Species present on the map (community field + your captures) with totals,
  // narrowed to the current search — feeds the Filter tab's list and its Hide-all.
  const counts = useMemo(() => {
    const map = new Map<SpeciesId, number>();
    for (const s of SEED_SIGHTINGS)
      if (matches(s.species, s.label)) map.set(s.species, (map.get(s.species) ?? 0) + 1);
    for (const g of gallery)
      if (matches(g.species, g.title)) map.set(g.species, (map.get(g.species) ?? 0) + 1);
    return [...map.entries()]
      .map(([species, count]) => ({ species, count }))
      .sort((a, b) => b.count - a.count);
  }, [gallery, matches]);

  const filter: FilterState = useMemo(
    () => ({
      hidden,
      counts,
      placeQuery,
      onPlaceQuery: setPlaceQuery,
      speciesQuery,
      onSpeciesQuery: setSpeciesQuery,
      onToggle: (s) =>
        setHidden((prev) => {
          const next = new Set(prev);
          if (next.has(s)) next.delete(s);
          else next.add(s);
          return next;
        }),
      onShowAll: () => setHidden(new Set()),
      onHideAll: () => setHidden(new Set(counts.map((c) => c.species))),
    }),
    [hidden, counts, placeQuery, speciesQuery],
  );

  // Two overlaid marker sets on one map, both honoring the species filter:
  //  • community field (SEED_SIGHTINGS) — static, read-only living survey;
  //  • your own captures (gallery) — clickable, open the gallery panel.
  // Memoized so we don't tear down and rebuild every DOM marker on each render.
  const markers = useMemo<SeaMarker[]>(() => {
    const community: SeaMarker[] = SEED_SIGHTINGS.filter(
      (s) => matches(s.species, s.label) && !hidden.has(s.species),
    ).map((s) => ({
      id: s.id,
      lng: s.lng,
      lat: s.lat,
      ...toMarker(s.species),
      label: s.label,
    }));
    const mine: SeaMarker[] = gallery
      .filter((g) => matches(g.species, g.title) && !hidden.has(g.species))
      .map((g) => ({
        id: g.id,
        lng: g.lng,
        lat: g.lat,
        ...toMarker(g.species),
        label: g.title,
        onClick: () => setOpenPanel("gallery"),
      }));
    return [...community, ...mine];
  }, [gallery, hidden, matches, setOpenPanel]);

  return (
    <div className="relative flex h-svh w-full overflow-hidden bg-background">
      {/* Left column — fixed on lg+ */}
      <Sidebar filter={filter} className="hidden w-[440px] shrink-0 border-r lg:flex" />

      {/* Left column — slide-in overlay on smaller screens */}
      {mobileOpen ? (
        <div className="absolute inset-0 z-40 lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-background/50 backdrop-blur-sm duration-200 animate-in fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-sm shadow-2xl duration-200 animate-in slide-in-from-left">
            <Sidebar filter={filter} onClose={() => setMobileOpen(false)} className="border-r" />
          </div>
        </div>
      ) : null}

      {/* Map area */}
      <div className="relative min-w-0 flex-1">
        <SeaMap className="absolute inset-0" center={[-9.31, 38.67]} zoom={9} markers={markers} showUserLocation />
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="absolute top-3 left-3 z-10 shadow-lg lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-4" />
        </Button>

        {/* Full HUD — level, streak, quick actions, profile — floating top-right. */}
        <MapHud />

        <MapLegend />
        <MissionsBoard />
      </div>

      {/* Modals — each binds to its own openPanel id via useGame(). */}
      <QuestSubmitDialog />
      <ProfileDialog />
      <GalleryDialog />
      <SettingsDialog />
      <PaymentsDialog />

      <LevelUpOverlay />
      {!user.connected && <LoginGate />}
    </div>
  );
}

// Decodes the marker colors. Small, bottom-left of the map area (clear of the
// missions board). Informational, so it stays click-through.
function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden rounded-xl border bg-card/80 px-3 py-2 shadow-xl backdrop-blur-md sm:block sm:bottom-4 sm:left-4">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Marker colors
      </p>
      <ul className="flex flex-col gap-1">
        {(Object.keys(RISK_META) as RiskClass[]).map((k) => (
          <li key={k} className="flex items-center gap-2 text-xs">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: RISK_META[k].color }} />
            <span className="text-foreground/80">{RISK_META[k].label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GameHub() {
  return (
    <GameProvider>
      <Hub />
    </GameProvider>
  );
}
