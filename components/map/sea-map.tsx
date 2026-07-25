"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import maplibregl, {
  type Map as MLMap,
  type LngLatLike,
  type GeoJSONSource,
} from "maplibre-gl";
import type { Feature, FeatureCollection, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";

// CARTO Positron (light) / Dark Matter (dark) — clean, near-monochrome basemaps
// used as-is: neutral land, minimal labels, streets kept, native water. Keyless.
const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const TEAL = "oklch(0.702 0.132 194)";

export type SeaMarker = {
  id: string;
  lng: number;
  lat: number;
  /** Accent color (token var or color); defaults to the teal primary. */
  color?: string;
  /** Pre-rendered SVG markup drawn inside the pin (uses currentColor → tinted by `color`). */
  icon?: string;
  label?: string;
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
};

export const SeaMap = forwardRef<SeaMapHandle, {
  className?: string;
  center?: LngLatLike;
  zoom?: number;
  markers?: SeaMarker[];
  interactive?: boolean;
  /** Dark basemap (Dark Matter + dark ocean). Used by the app; marketing stays light. */
  dark?: boolean;
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
    interactive = true,
    dark = false,
    showUserLocation = false,
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
  }));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: dark ? DARK_STYLE : LIGHT_STYLE,
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
    map.on("load", () => onReady?.(map));
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clustered sightings. Built-in MapLibre GeoJSON clustering feeds a pool of HTML
  // markers (the "cluster + HTML markers" pattern), so we keep the custom colored
  // species glyphs: small counted dots when zoomed out, clean colored icons when in.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const SOURCE_ID = "sightings";
    const LAYER_ID = "sightings-src";

    // 1) markers -> GeoJSON FeatureCollection (+ an id→SeaMarker lookup so we can
    // recover the icon/onClick that don't survive the trip through the source).
    const lookup = new Map<string, SeaMarker>();
    const data: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: markers.map((mk, i): Feature<Point> => {
        lookup.set(mk.id, mk);
        return {
          type: "Feature",
          id: i,
          properties: { id: mk.id, color: mk.color ?? TEAL, key: i },
          geometry: { type: "Point", coordinates: [mk.lng, mk.lat] },
        };
      }),
    };

    // Live HTML markers, keyed `cluster-<id>` / `pt-<id>`, reused across render
    // frames (pan/zoom); stale keys are pruned each sync.
    const pool: Record<string, maplibregl.Marker> = {};
    let disposed = false;
    // One reusable popup for marker clicks (data on the map).
    let popup: maplibregl.Popup | null = null;

    const buildClusterEl = (count: number, abbr: string) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "nautica-cluster";
      // A gentle size ramp with the count keeps big clusters glanceable.
      const size = count < 10 ? 30 : count < 50 ? 36 : count < 100 ? 42 : 48;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      const n = document.createElement("span");
      n.className = "nautica-cluster-count tnum";
      n.textContent = abbr;
      el.appendChild(n);
      return el;
    };

    const buildPointEl = (mk: SeaMarker) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "nautica-point";
      // Tinted chip matching the filter tiles: the icon's `currentColor` inherits
      // this category color, over an opaque tinted circle so it reads on the basemap.
      el.style.color = mk.color ?? TEAL;
      el.style.background = `color-mix(in oklch, ${mk.color ?? TEAL} 14%, white)`;
      if (mk.icon) {
        el.innerHTML = mk.icon;
      } else {
        const dot = document.createElement("span");
        dot.className = "nautica-point-dot";
        el.appendChild(dot);
      }
      if (mk.label) el.title = mk.label;
      const interactive = Boolean(mk.onClick || mk.popupHtml);
      if (interactive) {
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          mk.onClick?.(mk.id);
          if (mk.popupHtml) {
            popup?.remove();
            popup = new maplibregl.Popup({
              offset: 16,
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
      return el;
    };

    // Reconcile the marker pool against what's currently rendered for the source.
    const syncMarkers = () => {
      if (disposed) return;
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      if (!source || !map.isSourceLoaded(SOURCE_ID)) return;

      const present = new Set<string>();
      const features = map.querySourceFeatures(SOURCE_ID);

      for (const f of features) {
        if (!f.geometry || f.geometry.type !== "Point") continue;
        const coords = f.geometry.coordinates as [number, number];
        const props = f.properties ?? {};
        const isCluster = Boolean(props.cluster);
        const key = isCluster ? `cluster-${props.cluster_id}` : `pt-${props.id}`;
        if (present.has(key)) continue; // querySourceFeatures repeats across tile seams
        present.add(key);

        const existing = pool[key];
        if (existing) {
          existing.setLngLat(coords);
          if (isCluster) {
            const label = existing.getElement().querySelector(".nautica-cluster-count");
            if (label) label.textContent = String(props.point_count_abbreviated);
          }
          continue;
        }

        let el: HTMLElement | null = null;
        if (isCluster) {
          el = buildClusterEl(Number(props.point_count), String(props.point_count_abbreviated));
          const clusterId = Number(props.cluster_id);
          el.addEventListener("click", () => {
            (map.getSource(SOURCE_ID) as GeoJSONSource | undefined)
              ?.getClusterExpansionZoom(clusterId)
              .then((zoom) => map.easeTo({ center: coords, zoom, duration: 500 }))
              .catch(() => {});
          });
        } else {
          const mk = lookup.get(String(props.id));
          if (mk) el = buildPointEl(mk);
        }
        if (!el) continue;
        pool[key] = new maplibregl.Marker({ element: el }).setLngLat(coords).addTo(map);
      }

      // Prune markers that scrolled out of view / merged into a cluster.
      for (const key of Object.keys(pool)) {
        if (!present.has(key)) {
          pool[key].remove();
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
          cluster: true,
          clusterRadius: 50,
          clusterMaxZoom: 14,
        });
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
          pool[key].remove();
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
  }, [markers]);

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
