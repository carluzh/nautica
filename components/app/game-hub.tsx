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
import type { GalleryItem, SpeciesId } from "@/lib/game/types";
import { GameProvider, useGame } from "@/lib/game/provider";
import { useT } from "@/lib/i18n";
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

// Pre-render each category's Lucide icon to an SVG string once; markers embed it,
// and `currentColor` lets each pin tint the icon by category color.
const ICON_SVG = Object.fromEntries(
  CATEGORY_ORDER.map((cat) => [
    cat,
    renderToStaticMarkup(
      createElement(CATEGORY_META[cat].icon, { width: 16, height: 16, strokeWidth: 2, fill: "currentColor" }),
    ),
  ]),
) as Record<Category, string>;

function toMarker(species: SpeciesId): Pick<SeaMarker, "color" | "icon" | "category"> {
  const cat = speciesCategory(species);
  return { color: CATEGORY_META[cat].color, icon: ICON_SVG[cat], category: cat };
}

/** Feeds the segmented cluster ring. */
const CLUSTER_CATEGORIES = CATEGORY_ORDER.map((c) => ({ key: c, color: CATEGORY_META[c].color }));

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

/** Styled HTML for a map marker's click popup. */
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
  const { gallery, sightings, user, focusTarget, clearFocus } = useGame();
  const t = useT();
  const [hidden, setHidden] = useState<Set<Category>>(new Set());
  const [hiddenSpecies, setHiddenSpecies] = useState<Set<SpeciesId>>(new Set());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [period, setPeriod] = useState<TimePeriod>("24h");
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
    // Count the community store + the player's own captures as ONE set, deduped by
    // id (a submitted capture lives in both, but must only be tallied once).
    const counted = new Set<string>();
    const tally = (id: string, sp: SpeciesId, at?: number) => {
      if (counted.has(id) || !inPeriod(at)) return;
      counted.add(id);
      species[sp] += 1;
    };
    for (const s of sightings) tally(s.id, s.species, s.at);
    for (const g of gallery) tally(g.id, g.species, g.at);
    const cat = new Map<Category, number>(CATEGORY_ORDER.map((c) => [c, 0]));
    for (const s of Object.keys(species) as SpeciesId[])
      cat.set(speciesCategory(s), (cat.get(speciesCategory(s)) ?? 0) + species[s]);
    return {
      speciesCounts: species,
      categoryCounts: CATEGORY_ORDER.map((category) => ({ category, count: cat.get(category) ?? 0 })),
    };
  }, [gallery, sightings, period]);

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
      // Solo semantics: tapping a hidden category unhides it (additive); tapping
      // a visible one solos it (hides the rest); tapping the only visible one
      // brings every category back.
      onToggle: (c) =>
        setHidden((prev) => {
          if (prev.has(c)) {
            const next = new Set(prev);
            next.delete(c);
            return next;
          }
          const isOnlyVisible = prev.size === CATEGORY_ORDER.length - 1;
          return isOnlyVisible
            ? new Set<Category>()
            : new Set(CATEGORY_ORDER.filter((other) => other !== c));
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

    // The player's own captures render via the `mine` layer below; keep them out of
    // the community layer so a submitted sighting isn't drawn twice.
    const ownIds = new Set(gallery.map((g) => g.id));
    const community: SeaMarker[] = sightings
      .filter((s) => !ownIds.has(s.id) && visible(s.species) && inPeriod(s.at))
      .map((s) => ({
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
          photo: g.photo,
          reward: `+${g.xp} XP · 0G verified`,
        }),
      }));

    return [...community, ...mine];
  }, [gallery, sightings, hidden, hiddenSpecies, period]);

  return (
    <div className="theme-dark relative flex h-svh w-full overflow-hidden bg-background">
      <Sidebar filter={filter} className="hidden w-[440px] shrink-0 border-r lg:flex" />

      {/* Slide-in sidebar overlay on smaller screens */}
      {mobileOpen ? (
        <div className="absolute inset-0 z-40 lg:hidden">
          <button
            aria-label={t("Close menu")}
            className="absolute inset-0 bg-background/50 backdrop-blur-sm duration-200 animate-in fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-sm shadow-2xl duration-200 animate-in slide-in-from-left">
            <Sidebar filter={filter} onClose={() => setMobileOpen(false)} className="border-r" />
          </div>
        </div>
      ) : null}

      <div className="relative min-w-0 flex-1">
        <SeaMap
          ref={mapRef}
          dark
          clusterCategories={CLUSTER_CATEGORIES}
          className="absolute inset-0"
          // Wide fallback view framing the data regions (Europe, Vietnam, Australia);
          // with geolocation granted the map flies to the user right after mount.
          center={[62, 18]}
          zoom={2}
          markers={markers}
          showUserLocation
        />
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="absolute top-3 left-3 z-10 shadow-lg lg:hidden"
          aria-label={t("Open menu")}
        >
          <Menu className="size-4" />
        </Button>

        <MapHud />

        <MissionsBoard />
      </div>

      {/* Modals - each binds to its own openPanel id via useGame(). */}
      <QuestSubmitDialog />
      <LevelDialog />
      <ProfileDialog />
      <GalleryDialog />
      <SettingsDialog />

      <LevelUpOverlay />
      {!user.connected && <LoginGate />}
    </div>
  );
}

export function GameHub() {
  // Scope dark theme to the app: add `.theme-dark` to <html> while the hub is mounted
  // so portaled UI (dialogs, dropdowns, toasts) is dark too, then remove it on unmount
  // so the rest of the site stays light. The hub root also carries the class (above)
  // so the first paint is dark with no flash.
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
