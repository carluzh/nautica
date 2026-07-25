"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import maplibregl, {
  type Map as MLMap,
  type LngLatLike,
  type GeoJSONSource,
  type GeoJSONSourceSpecification,
} from "maplibre-gl";
import type { Feature, FeatureCollection, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";

// Real, professionally-designed keyless basemaps used as-is: CARTO Positron (light,
// the marketing hero) and Dark Matter (dark, the app). The ONLY app customization is
// a slightly blue-ish water fill (see the load handler) — nothing else is touched.
const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const WATER_BLUE = "#12314c"; // a bit blueish, still dark

const TEAL = "oklch(0.702 0.132 194)";
const MARKER_INK = "#0b1420"; // near-black dark blue (≈ the landmass) — the marker glyph color
const NEAR_PX = 42; // filled icon-circles closer than this (px) collapse to pulsing dots
const ICON_MIN_ZOOM = 13.5; // below this, always show the cleaner dots; icons only when very zoomed in

export type SeaMarker = {
  id: string;
  lng: number;
  lat: number;
  /** Accent color (token var or color); defaults to the teal primary. */
  color?: string;
  /** Pre-rendered SVG markup drawn inside the pin (uses currentColor → tinted by `color`). */
  icon?: string;
  label?: string;
  /** Category key — drives the segmented cluster ring. */
  category?: string;
  /** HTML shown in a click popup on the marker (item 6 — data on the map). */
  popupHtml?: string;
  onClick?: (id: string) => void;
};

/** Imperative handle exposed to the hub for map actions React can't do declaratively. */
export type SeaMapHandle = {
  /** Fly back to the live user-location dot (used by the top-right recenter button). */
  recenterToUser: () => void;
  /** Fly the viewport to a coordinate (used by the location search). */
  flyTo: (center: [number, number], zoom?: number) => void;
  /** Open a standalone popup at a coordinate (used to focus a clicked sighting). */
  showPopup: (center: [number, number], html: string) => void;
};

export const SeaMap = forwardRef<SeaMapHandle, {
  className?: string;
  center?: LngLatLike;
  zoom?: number;
  markers?: SeaMarker[];
  /** Cluster nearby markers (default true); pass false for decorative maps. */
  cluster?: boolean;
  interactive?: boolean;
  /** Dark basemap (Dark Matter, water nudged a touch blue). Used by the app; marketing stays light. */
  dark?: boolean;
  /** Basemap style URL; overrides the theme default (light/dark). Used by the marketing maps. */
  styleUrl?: string;
  /** Category key + color per finding type — drives the segmented cluster ring. */
  clusterCategories?: { key: string; color: string }[];
  /** Opt-in: track + show a live blue user-location dot. */
  showUserLocation?: boolean;
  /** Fires as the view moves off / back onto the user's live location (needs showUserLocation). */
  onAwayChange?: (away: boolean) => void;
  onReady?: (map: MLMap) => void;
}>(function SeaMap(
  {
    className,
    center = [-9.15, 38.7], // Lisbon coast
    zoom = 8,
    markers = [],
    cluster = true,
    interactive = true,
    dark = false,
    clusterCategories = [],
    showUserLocation = false,
    styleUrl,
    onAwayChange,
    onReady,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  // Latest known user coords ([lng, lat]); read by the recenter handle + away check.
  const userCoordRef = useRef<[number, number] | null>(null);
  // Keep the latest onAwayChange without re-running the location effect.
  const onAwayChangeRef = useRef(onAwayChange);
  onAwayChangeRef.current = onAwayChange;
  // Standalone popup for a focused sighting (from the activity feed).
  const focusPopupRef = useRef<maplibregl.Popup | null>(null);

  // Imperative actions for the hub (recenter button + location search).
  useImperativeHandle(ref, () => ({
    recenterToUser: () => {
      const map = mapRef.current;
      if (!map) return;
      const known = userCoordRef.current;
      if (known) {
        map.flyTo({ center: known, zoom: 14, duration: 800 });
        return;
      }
      // No fix yet — ask once, then fly.
      if (typeof navigator === "undefined" || !navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          userCoordRef.current = c;
          map.flyTo({ center: c, zoom: 14, duration: 800 });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
      );
    },
    flyTo: (center, zoom = 13) => {
      mapRef.current?.flyTo({ center, zoom, duration: 1200 });
    },
    showPopup: (center, html) => {
      const map = mapRef.current;
      if (!map) return;
      focusPopupRef.current?.remove();
      focusPopupRef.current = new maplibregl.Popup({ offset: 14, closeButton: true, closeOnClick: true, className: "nautica-popup", maxWidth: "240px" })
        .setLngLat(center).setHTML(html).addTo(map);
    },
  }));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl ?? (dark ? DARK_STYLE : LIGHT_STYLE),
      center,
      zoom,
      interactive,
      attributionControl: false,
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    if (interactive) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    }
    mapRef.current = map;
    map.on("load", () => {
      // The only basemap customization: nudge the water a touch blue on the dark app.
      if (dark && map.getLayer("water")) {
        try {
          map.setPaintProperty("water", "fill-color", WATER_BLUE);
        } catch {
          /* ignore if the water layer isn't a simple fill on this style version */
        }
      }
      onReady?.(map);
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sighting markers — a 3-tier density system over MapLibre's GeoJSON clustering:
  //   roomy    → a filled colored circle with a dark-ink glyph (buildIcon);
  //   crowding → a small pulsing solid dot in the finding's color (buildDot);
  //   dense    → a segmented donut cluster by category with a small count (buildCluster).
  // A small cluster radius handles the dense tier (only when dots would overlap); a
  // per-frame pixel-proximity pass on the remaining points chooses icon vs dot.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const SOURCE_ID = "sightings";
    const LAYER_ID = "sightings-src";
    type Mode = "icon" | "dot" | "cluster";

    // markers -> GeoJSON (+ an id→SeaMarker lookup for the icon/onClick that don't
    // survive the source). Each feature carries its `cat` for the cluster tallies.
    const lookup = new Map<string, SeaMarker>();
    const data: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: markers.map((mk, i): Feature<Point> => {
        lookup.set(mk.id, mk);
        return {
          type: "Feature",
          id: i,
          properties: { id: mk.id, cat: mk.category ?? "", color: mk.color ?? TEAL },
          geometry: { type: "Point", coordinates: [mk.lng, mk.lat] },
        };
      }),
    };

    // Per-cluster category tallies (cnt_<key>) that feed the segmented ring.
    const clusterProperties: Record<string, unknown> = {};
    for (const c of clusterCategories) {
      clusterProperties[`cnt_${c.key}`] = ["+", ["case", ["==", ["get", "cat"], c.key], 1, 0]];
    }

    const pool: Record<string, { marker: maplibregl.Marker; mode: Mode }> = {};
    let disposed = false;
    let popup: maplibregl.Popup | null = null;

    const attach = (el: HTMLElement, mk: SeaMarker) => {
      if (mk.label) el.title = mk.label;
      if (mk.onClick || mk.popupHtml) {
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          mk.onClick?.(mk.id);
          if (mk.popupHtml) {
            popup?.remove();
            popup = new maplibregl.Popup({
              offset: 14,
              closeButton: true,
              closeOnClick: true,
              className: "nautica-popup",
              maxWidth: "240px",
            })
              .setLngLat([mk.lng, mk.lat])
              .setHTML(mk.popupHtml)
              .addTo(map);
          }
        });
      } else {
        el.style.cursor = "default";
      }
    };

    // Tier 1 — filled colored circle with a dark-ink glyph.
    const buildIcon = (mk: SeaMarker) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "nautica-point";
      el.style.background = mk.color ?? TEAL;
      el.style.color = MARKER_INK;
      if (mk.icon) el.innerHTML = mk.icon;
      else {
        const d = document.createElement("span");
        d.className = "nautica-point-dot";
        el.appendChild(d);
      }
      attach(el, mk);
      return el;
    };

    // Tier 2 — small pulsing solid dot in the finding's color.
    const buildDot = (mk: SeaMarker) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "nautica-dot";
      el.style.color = mk.color ?? TEAL;
      const pulse = document.createElement("span");
      pulse.className = "nautica-dot-pulse";
      const core = document.createElement("span");
      core.className = "nautica-dot-core";
      el.append(pulse, core);
      attach(el, mk);
      return el;
    };

    // Tier 3 — segmented donut cluster.
    const clusterSize = (count: number) => (count < 10 ? 34 : count < 50 ? 40 : count < 100 ? 46 : 52);
    const paintCluster = (el: HTMLElement, props: Record<string, unknown>) => {
      const count = Number(props.point_count) || 0;
      let acc = 0;
      const stops: string[] = [];
      for (const c of clusterCategories) {
        const n = Number(props[`cnt_${c.key}`]) || 0;
        if (n <= 0) continue;
        const frac = count > 0 ? n / count : 0;
        stops.push(`${c.color} ${(acc * 100).toFixed(2)}% ${((acc + frac) * 100).toFixed(2)}%`);
        acc += frac;
      }
      el.style.background = stops.length ? `conic-gradient(${stops.join(", ")})` : TEAL;
      const label = el.querySelector(".nautica-cluster-count");
      if (label) label.textContent = String(props.point_count_abbreviated ?? count);
    };
    const buildCluster = (props: Record<string, unknown>) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "nautica-cluster";
      const size = clusterSize(Number(props.point_count) || 0);
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      const hole = document.createElement("span");
      hole.className = "nautica-cluster-hole";
      const holeSize = size - 11;
      hole.style.width = `${holeSize}px`;
      hole.style.height = `${holeSize}px`;
      const label = document.createElement("span");
      label.className = "nautica-cluster-count tnum";
      hole.appendChild(label);
      el.appendChild(hole);
      paintCluster(el, props);
      return el;
    };

    // Reconcile the marker pool against what's currently rendered for the source.
    const syncMarkers = () => {
      if (disposed) return;
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (!source || !map.isSourceLoaded(SOURCE_ID)) return;

      const seen = new Set<string>();
      const clusters: { key: string; coords: [number, number]; props: Record<string, unknown> }[] = [];
      const pts: { key: string; id: string; coords: [number, number]; x: number; y: number; mode: Mode }[] = [];

      for (const f of map.querySourceFeatures(SOURCE_ID)) {
        if (!f.geometry || f.geometry.type !== "Point") continue;
        const coords = f.geometry.coordinates as [number, number];
        const props = f.properties ?? {};
        if (props.cluster) {
          const key = `cluster-${props.cluster_id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          clusters.push({ key, coords, props });
        } else {
          const key = `pt-${props.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const p = map.project(coords);
          pts.push({ key, id: String(props.id), coords, x: p.x, y: p.y, mode: "icon" });
        }
      }

      // Zoomed out we always show the cleaner dots; icons appear only when very
      // zoomed in, and even then collapse back to a dot if another point is near.
      const iconsAllowed = map.getZoom() >= ICON_MIN_ZOOM;
      for (let i = 0; i < pts.length; i++) {
        if (!iconsAllowed) {
          pts[i].mode = "dot";
          continue;
        }
        for (let j = 0; j < pts.length; j++) {
          if (i === j) continue;
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          if (dx * dx + dy * dy < NEAR_PX * NEAR_PX) {
            pts[i].mode = "dot";
            break;
          }
        }
      }

      const present = new Set<string>();

      for (const c of clusters) {
        present.add(c.key);
        const ex = pool[c.key];
        if (ex && ex.mode === "cluster") {
          ex.marker.setLngLat(c.coords);
          paintCluster(ex.marker.getElement(), c.props);
          continue;
        }
        if (ex) {
          ex.marker.remove();
          delete pool[c.key];
        }
        const el = buildCluster(c.props);
        const clusterId = Number(c.props.cluster_id);
        el.addEventListener("click", () => {
          (map.getSource(SOURCE_ID) as GeoJSONSource | undefined)
            ?.getClusterExpansionZoom(clusterId)
            .then((z) => map.easeTo({ center: c.coords, zoom: z, duration: 500 }))
            .catch(() => {});
        });
        pool[c.key] = { marker: new maplibregl.Marker({ element: el }).setLngLat(c.coords).addTo(map), mode: "cluster" };
      }

      for (const p of pts) {
        present.add(p.key);
        const mk = lookup.get(p.id);
        if (!mk) continue;
        const ex = pool[p.key];
        if (ex && ex.mode === p.mode) {
          ex.marker.setLngLat(p.coords);
          continue;
        }
        if (ex) {
          ex.marker.remove();
          delete pool[p.key];
        }
        const el = p.mode === "dot" ? buildDot(mk) : buildIcon(mk);
        pool[p.key] = { marker: new maplibregl.Marker({ element: el }).setLngLat(p.coords).addTo(map), mode: p.mode };
      }

      for (const key of Object.keys(pool)) {
        if (!present.has(key)) {
          pool[key].marker.remove();
          delete pool[key];
        }
      }
    };

    // Add (or refresh) the clustered source + an invisible probe layer that forces
    // the source's tiles to load in the viewport, keeping querySourceFeatures reliable.
    const setup = () => {
      if (disposed) return;
      const existing = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (existing) {
        existing.setData(data);
      } else {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data,
          cluster,
          // Small radius: only group when the dots themselves would overlap.
          clusterRadius: 14,
          clusterMaxZoom: 16,
          clusterProperties,
        } as GeoJSONSourceSpecification);
      }
      if (!map.getLayer(LAYER_ID)) {
        map.addLayer({
          id: LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          paint: { "circle-radius": 0, "circle-opacity": 0 },
        });
      }
      map.on("render", syncMarkers);
      map.on("moveend", syncMarkers);
      syncMarkers();
    };

    if (map.isStyleLoaded()) setup();
    else map.once("load", setup);

    return () => {
      disposed = true;
      popup?.remove();
      popup = null;
      map.off("render", syncMarkers);
      map.off("moveend", syncMarkers);
      map.off("load", setup); // in case the style never finished loading
      for (const key of Object.keys(pool)) {
        try {
          pool[key].marker.remove();
        } catch {
          /* map may already be torn down (unmount) — the container unmounts anyway */
        }
        delete pool[key];
      }
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {
        /* style already torn down on unmount — map.remove() handles the rest */
      }
    };
  }, [markers, clusterCategories, cluster]);

  // Live user location (opt-in). Watches the device position and drops a blue dot,
  // and reports whether the view has moved off that dot so the hub can show the
  // recenter button. Missing/denied geolocation degrades silently — no dot, no crash.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showUserLocation) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    // Build the dot element once: pulsing accuracy ring behind a ringed blue dot.
    const el = document.createElement("div");
    el.className = "nautica-user-location";
    const pulse = document.createElement("span");
    pulse.className = "nautica-user-pulse";
    const dot = document.createElement("span");
    dot.className = "nautica-user-dot";
    el.append(pulse, dot);

    let marker: maplibregl.Marker | null = null;

    // "Away" = we have a fix AND the dot is currently off-screen.
    const reportAway = () => {
      const known = userCoordRef.current;
      const away = known ? !map.getBounds().contains(known) : false;
      onAwayChangeRef.current?.(away);
    };

    const apply = (lng: number, lat: number) => {
      const lngLat: [number, number] = [lng, lat];
      userCoordRef.current = lngLat;
      if (!marker) {
        marker = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
      } else {
        marker.setLngLat(lngLat);
      }
      reportAway();
    };

    map.on("move", reportAway);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => apply(pos.coords.longitude, pos.coords.latitude),
      () => {
        /* permission denied / position unavailable — keep the dot hidden */
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      map.off("move", reportAway);
      onAwayChangeRef.current?.(false);
      marker?.remove();
      marker = null;
      userCoordRef.current = null;
    };
  }, [showUserLocation]);

  return <div ref={containerRef} className={cn("h-full w-full", className)} />;
});
