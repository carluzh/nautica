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
import { REAL_SIGHTINGS as SEED_SIGHTINGS } from "@/sightings";
import type { GalleryItem, SpeciesId } from "@/lib/game/types";
import { GameProvider, useGame } from "@/lib/game/provider";
import { Sidebar } from "./sidebar/sidebar";
import { MapHud } from "./map-hud";
import type { FilterState, TimePeriod } from "./sidebar/types";
import { LoginGate } from "./login-gate";
import { LevelUpOverlay } from "./level-up-overlay";
import { MissionsBoard } from "./panels/missions-board";
import { QuestSubmitDialog } from "./panels/quest-submit-dialog";
import { LevelDialog } from "./panels/level-dialog";
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

/** Marker color + icon + category (glanceable, matches the filter tiles); tooltip = species + place. */
function toMarker(species: SpeciesId): Pick<SeaMarker, "color" | "icon" | "category"> {
  const cat = speciesCategory(species);
  return { color: CATEGORY_META[cat].color, icon: ICON_SVG[cat], category: cat };
}

/** Category key + color per finding type — feeds the segmented cluster ring. */
const CLUSTER_CATEGORIES = CATEGORY_ORDER.map((c) => ({ key: c, color: CATEGORY_META[c].color }));

/** Time-period windows (ms) for the map filter. */
const PERIOD_MS: Record<"24h" | "7d" | "1m", number> = {
  "24h": 24 * 3600e3,
  "7d": 7 * 24 * 3600e3,
  "1m": 30 * 24 * 3600e3,
};

/** The place portion of a "Species · Place" community label. */
function placeOf(label?: string): string | undefined {
  if (!label) return undefined;
  const i = label.indexOf("·");
  return i >= 0 ? label.slice(i + 1).trim() : label;
}

/** Escape user/observation-derived text before it goes into popup innerHTML. */
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

/** Styled HTML for a map marker's click popup (item 6 — data on the map). */
function popupHtml(opts: {
  title: string;
  species: SpeciesId;
  place?: string;
  lat: number;
  lng: number;
  reward?: string;
  photo?: string;
  attribution?: string;
}): string {
  const meta = CATEGORY_META[speciesCategory(opts.species)];
  const short = SPECIES_META[opts.species].short;
  return (
    `<div class="np">` +
    (opts.photo ? `<div class="np-photo"><img src="${esc(opts.photo)}" alt="" loading="lazy" referrerpolicy="no-referrer"></div>` : "") +
    `<div class="np-title">${esc(opts.title)}</div>` +
    `<div class="np-cat"><span class="np-dot" style="background:${meta.color}"></span>${esc(meta.label)} · ${esc(short)}</div>` +
    (opts.place ? `<div class="np-sub">${esc(opts.place)}</div>` : "") +
    `<div class="np-coords">${opts.lat.toFixed(3)}, ${opts.lng.toFixed(3)}</div>` +
    (opts.reward ? `<div class="np-reward">${esc(opts.reward)}</div>` : "") +
    (opts.attribution ? `<div class="np-attr">${esc(opts.attribution)}</div>` : "") +
    `</div>`
  );
}

function Hub() {
  const { gallery, user, focusTarget, clearFocus } = useGame();
  const [hidden, setHidden] = useState<Set<Category>>(new Set());
  const [hiddenSpecies, setHiddenSpecies] = useState<Set<SpeciesId>>(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [period, setPeriod] = useState<TimePeriod>("all");
  const mapRef = useRef<SeaMapHandle>(null);

  // Focus a sighting clicked in the activity feed: fly there and open its popup.
  useEffect(() => {
    if (!focusTarget) return;
    const html = popupHtml({
      title: focusTarget.title,
      species: focusTarget.species,
      place: focusTarget.place ?? "Your capture",
      lat: focusTarget.lat,
      lng: focusTarget.lng,
      photo: focusTarget.photo,
      attribution: focusTarget.attribution,
    });
    mapRef.current?.flyTo([focusTarget.lng, focusTarget.lat], 15);
    mapRef.current?.showPopup([focusTarget.lng, focusTarget.lat], html);
    clearFocus();
  }, [focusTarget, clearFocus]);

  // Marker counts per species and per category (community field + your captures).
  const { speciesCounts, categoryCounts } = useMemo(() => {
    const cutoff = period === "all" ? 0 : Date.now() - PERIOD_MS[period];
    const inPeriod = (at?: number) => at == null || at >= cutoff;
    const species = Object.fromEntries(
      (Object.keys(SPECIES_META) as SpeciesId[]).map((s) => [s, 0]),
    ) as Record<SpeciesId, number>;
    for (const s of SEED_SIGHTINGS) if (inPeriod(s.at)) species[s.species] += 1;
    for (const g of gallery) if (inPeriod(g.at)) species[g.species] += 1;
    const cat = new Map<Category, number>(CATEGORY_ORDER.map((c) => [c, 0]));
    for (const s of Object.keys(species) as SpeciesId[])
      cat.set(speciesCategory(s), (cat.get(speciesCategory(s)) ?? 0) + species[s]);
    return {
      speciesCounts: species,
      categoryCounts: CATEGORY_ORDER.map((category) => ({ category, count: cat.get(category) ?? 0 })),
    };
  }, [gallery, period]);

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
      onSoloSpecies: (species) => {
        setHiddenSpecies(new Set((Object.keys(SPECIES_META) as SpeciesId[]).filter((s) => s !== species)));
        setHidden(new Set()); // show all categories so the soloed species is visible
      },
      onSearchPlace,
      searching,
      period,
      onPeriod: setPeriod,
    }),
    [hidden, hiddenSpecies, categoryCounts, speciesCounts, onSearchPlace, searching, period],
  );

  // Both marker layers honor BOTH filter dimensions (category AND species) and carry
  // a click popup with the sighting's data.
  const markers = useMemo<SeaMarker[]>(() => {
    const cutoff = period === "all" ? 0 : Date.now() - PERIOD_MS[period];
    const inPeriod = (at?: number) => at == null || at >= cutoff;
    const visible = (species: SpeciesId) =>
      !hidden.has(speciesCategory(species)) && !hiddenSpecies.has(species);

    const community: SeaMarker[] = SEED_SIGHTINGS.filter((s) => visible(s.species) && inPeriod(s.at)).map((s) => ({
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
        photo: s.photo,
        attribution: s.attribution,
      }),
    }));

    const mine: SeaMarker[] = gallery
      .filter((g: GalleryItem) => visible(g.species) && inPeriod(g.at))
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
  }, [gallery, hidden, hiddenSpecies, period]);

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
          clusterCategories={CLUSTER_CATEGORIES}
          className="absolute inset-0"
          center={[-9.31, 38.67]}
          zoom={9}
          markers={markers}
          showUserLocation
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

        {/* Full HUD — level, streak, quick actions, profile — floating top-right. */}
        <MapHud />

        <MissionsBoard />
      </div>

      {/* Modals — each binds to its own openPanel id via useGame(). */}
      <QuestSubmitDialog />
      <LevelDialog />
      <ProfileDialog />
      <GalleryDialog />
      <SettingsDialog />
      <PaymentsDialog />

      <LevelUpOverlay />
      {!user.connected && <LoginGate />}
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
