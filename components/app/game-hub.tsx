"use client";

import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Menu } from "lucide-react";
import { toast } from "sonner";
import { SeaMap, type SeaMapHandle, type SeaMarker } from "@/components/map/sea-map";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  SPECIES_META,
  speciesCategory,
  type Category,
} from "@/lib/game/content";
import { SEED_SIGHTINGS } from "@/lib/game/mock";
import type { GalleryItem, SpeciesId } from "@/lib/game/types";
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

// Pre-render each CATEGORY's Lucide icon to an SVG string once — the same 4 icons
// as the left-column filter tiles. The imperative map markers embed this;
// `currentColor` lets each pin tint the icon by category color.
const ICON_SVG = Object.fromEntries(
  CATEGORY_ORDER.map((cat) => [
    cat,
    renderToStaticMarkup(
      createElement(CATEGORY_META[cat].icon, { width: 16, height: 16, strokeWidth: 2, fill: "currentColor" }),
    ),
  ]),
) as Record<Category, string>;

/** Marker color + icon = category (glanceable, matches the filter tiles); tooltip = species + place. */
function toMarker(species: SpeciesId): Pick<SeaMarker, "color" | "icon"> {
  const cat = speciesCategory(species);
  return { color: CATEGORY_META[cat].color, icon: ICON_SVG[cat] };
}

/** The place portion of a "Species · Place" community label. */
function placeOf(label?: string): string | undefined {
  if (!label) return undefined;
  const i = label.indexOf("·");
  return i >= 0 ? label.slice(i + 1).trim() : label;
}

/** Styled HTML for a map marker's click popup (item 6 — data on the map). */
function popupHtml(opts: {
  title: string;
  species: SpeciesId;
  place?: string;
  lat: number;
  lng: number;
  reward?: string;
}): string {
  const meta = CATEGORY_META[speciesCategory(opts.species)];
  const short = SPECIES_META[opts.species].short;
  return (
    `<div class="np">` +
    `<div class="np-title">${opts.title}</div>` +
    `<div class="np-cat"><span class="np-dot" style="background:${meta.color}"></span>${meta.label} · ${short}</div>` +
    (opts.place ? `<div class="np-sub">${opts.place}</div>` : "") +
    `<div class="np-coords">${opts.lat.toFixed(3)}, ${opts.lng.toFixed(3)}</div>` +
    (opts.reward ? `<div class="np-reward">${opts.reward}</div>` : "") +
    `</div>`
  );
}

function Hub() {
  const { gallery, user } = useGame();
  const [hidden, setHidden] = useState<Set<Category>>(new Set());
  const [hiddenSpecies, setHiddenSpecies] = useState<Set<SpeciesId>>(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [awayFromUser, setAwayFromUser] = useState(false);
  const [searching, setSearching] = useState(false);
  const mapRef = useRef<SeaMapHandle>(null);

  // Marker counts per species and per category (community field + your captures).
  const { speciesCounts, categoryCounts } = useMemo(() => {
    const species = Object.fromEntries(
      (Object.keys(SPECIES_META) as SpeciesId[]).map((s) => [s, 0]),
    ) as Record<SpeciesId, number>;
    for (const s of SEED_SIGHTINGS) species[s.species] += 1;
    for (const g of gallery) species[g.species] += 1;
    const cat = new Map<Category, number>(CATEGORY_ORDER.map((c) => [c, 0]));
    for (const s of Object.keys(species) as SpeciesId[])
      cat.set(speciesCategory(s), (cat.get(speciesCategory(s)) ?? 0) + species[s]);
    return {
      speciesCounts: species,
      categoryCounts: CATEGORY_ORDER.map((category) => ({ category, count: cat.get(category) ?? 0 })),
    };
  }, [gallery]);

  // Location search: geocode via Photon (keyless, CORS-friendly), biased to the
  // Lisbon coast, then fly the map there. Does NOT filter markers.
  const onSearchPlace = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1&lat=38.72&lon=-9.2`;
      const res = await fetch(url);
      const json = (await res.json()) as { features?: { geometry?: { coordinates?: [number, number] } }[] };
      const coords = json.features?.[0]?.geometry?.coordinates;
      if (!coords) {
        toast.error(`Couldn't find "${q}"`);
        return;
      }
      mapRef.current?.flyTo([coords[0], coords[1]], 12);
    } catch {
      toast.error("Location search failed. Try again.");
    } finally {
      setSearching(false);
    }
  }, []);

  const filter: FilterState = useMemo(
    () => ({
      hidden,
      categories: categoryCounts,
      onToggle: (c) =>
        setHidden((prev) => {
          const next = new Set(prev);
          next.has(c) ? next.delete(c) : next.add(c);
          return next;
        }),
      onShowAll: () => setHidden(new Set()),
      onHideAll: () => setHidden(new Set(CATEGORY_ORDER)),
      hiddenSpecies,
      speciesCounts,
      onToggleSpecies: (s) =>
        setHiddenSpecies((prev) => {
          const next = new Set(prev);
          next.has(s) ? next.delete(s) : next.add(s);
          return next;
        }),
      onToggleGroup: (species, visible) =>
        setHiddenSpecies((prev) => {
          const next = new Set(prev);
          for (const s of species) visible ? next.delete(s) : next.add(s);
          return next;
        }),
      onSearchPlace,
      searching,
    }),
    [hidden, hiddenSpecies, categoryCounts, speciesCounts, onSearchPlace, searching],
  );

  // Both marker layers honor BOTH filter dimensions (category AND species) and carry
  // a click popup with the sighting's data.
  const markers = useMemo<SeaMarker[]>(() => {
    const visible = (species: SpeciesId) =>
      !hidden.has(speciesCategory(species)) && !hiddenSpecies.has(species);

    const community: SeaMarker[] = SEED_SIGHTINGS.filter((s) => visible(s.species)).map((s) => ({
      id: s.id,
      lng: s.lng,
      lat: s.lat,
      ...toMarker(s.species),
      label: s.label,
      popupHtml: popupHtml({
        title: SPECIES_META[s.species].short,
        species: s.species,
        place: placeOf(s.label),
        lat: s.lat,
        lng: s.lng,
      }),
    }));

    const mine: SeaMarker[] = gallery
      .filter((g: GalleryItem) => visible(g.species))
      .map((g) => ({
        id: g.id,
        lng: g.lng,
        lat: g.lat,
        ...toMarker(g.species),
        label: g.title,
        popupHtml: popupHtml({
          title: g.title,
          species: g.species,
          place: "Your capture",
          lat: g.lat,
          lng: g.lng,
          reward: `+${g.xp} XP${g.usdc ? ` · $${g.usdc}` : ""} · 0G verified`,
        }),
      }));

    return [...community, ...mine];
  }, [gallery, hidden, hiddenSpecies]);

  return (
    <div className="theme-dark relative flex h-svh w-full overflow-hidden bg-background">
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
        <SeaMap
          ref={mapRef}
          dark
          className="absolute inset-0"
          center={[-9.31, 38.67]}
          zoom={9}
          markers={markers}
          showUserLocation
          onAwayChange={setAwayFromUser}
        />
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="absolute top-3 left-3 z-10 shadow-lg lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-4" />
        </Button>

        {/* Full HUD — level, streak, quick actions, profile — floating top-right.
            The recenter button appears just left of it once you pan off yourself. */}
        <MapHud showRecenter={awayFromUser} onRecenter={() => mapRef.current?.recenterToUser()} />

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
        {CATEGORY_ORDER.map((k) => (
          <li key={k} className="flex items-center gap-2 text-xs">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_META[k].color }} />
            <span className="text-foreground/80">{CATEGORY_META[k].label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GameHub() {
  // Dark theme is scoped to the app: add `.theme-dark` to <html> while the hub is
  // mounted so portaled UI (dialogs, dropdowns, toasts) is dark too, then remove it
  // on unmount so marketing/pro stay light. The hub's own root also carries the
  // class (above) so the first paint is dark with no flash.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("theme-dark");
    return () => root.classList.remove("theme-dark");
  }, []);

  return (
    <GameProvider>
      <Hub />
    </GameProvider>
  );
}
