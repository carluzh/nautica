"use client";

import { useEffect, useRef } from "react";
import maplibregl, {
  type Map as MLMap,
  type LngLatLike,
  type IControl,
  type GeoJSONSource,
} from "maplibre-gl";
import type { Feature, FeatureCollection, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";

// CARTO Voyager — a soft, colorful basemap (blue water, warm land, green parks),
// keyless. The colored, Airbnb-adjacent look that makes the sea/coast read clearly.
const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

const TEAL = "oklch(0.702 0.132 194)";

// Crosshair/"locate-fixed" glyph for the recenter control. Inherits currentColor
// so the CSS hover tint applies; sized by `.nautica-locate-btn svg` in globals.css.
const LOCATE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>`;

// A small MapLibre control (its own `.maplibregl-ctrl-group` card, so it inherits
// the rounded/soft-shadow chrome from globals.css) that recenters on the user.
class LocateControl implements IControl {
  private container: HTMLDivElement | null = null;
  constructor(private readonly onLocate: () => void) {}
  onAdd() {
    const container = document.createElement("div");
    container.className = "maplibregl-ctrl maplibregl-ctrl-group";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nautica-locate-btn";
    btn.title = "Show my location";
    btn.setAttribute("aria-label", "Show my location");
    btn.innerHTML = LOCATE_ICON;
    btn.addEventListener("click", this.onLocate);
    container.appendChild(btn);
    this.container = container;
    return container;
  }
  onRemove() {
    this.container?.remove();
    this.container = null;
  }
}

export type SeaMarker = {
  id: string;
  lng: number;
  lat: number;
  /** Accent color (token var or color); defaults to the teal primary. */
  color?: string;
  /** Pre-rendered SVG markup drawn inside the pin (uses currentColor → tinted by `color`). */
  icon?: string;
  label?: string;
  onClick?: (id: string) => void;
};

export function SeaMap({
  className,
  center = [-9.15, 38.7], // Lisbon coast
  zoom = 8,
  markers = [],
  interactive = true,
  showUserLocation = false,
  onReady,
}: {
  className?: string;
  center?: LngLatLike;
  zoom?: number;
  markers?: SeaMarker[];
  interactive?: boolean;
  /** Opt-in: track + show a live blue user-location dot and a recenter control. */
  showUserLocation?: boolean;
  onReady?: (map: MLMap) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  // Latest known user coords ([lng, lat]); read by the recenter control.
  const userCoordRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: LIGHT_STYLE,
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
      // Clean colored glyph: the icon's `currentColor` inherits this risk color.
      el.style.color = mk.color ?? TEAL;
      if (mk.icon) {
        el.innerHTML = mk.icon;
      } else {
        const dot = document.createElement("span");
        dot.className = "nautica-point-dot";
        el.appendChild(dot);
      }
      if (mk.label) el.title = mk.label;
      if (mk.onClick) el.addEventListener("click", () => mk.onClick?.(mk.id));
      else el.style.cursor = "default";
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

  // Live user location (opt-in). Watches the device position, drops a Google/
  // Airbnb-style blue dot (created once, then `setLngLat`), and mounts a recenter
  // control. Missing/denied geolocation degrades silently — no dot, no crash.
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

    const apply = (lng: number, lat: number) => {
      const lngLat: [number, number] = [lng, lat];
      userCoordRef.current = lngLat;
      if (!marker) {
        marker = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
      } else {
        marker.setLngLat(lngLat);
      }
    };

    const flyTo = (lng: number, lat: number) =>
      map.flyTo({ center: [lng, lat], zoom: 14, duration: 800 });

    // Recenter: use the last known fix if we have one, else ask for it once.
    const handleLocate = () => {
      const known = userCoordRef.current;
      if (known) {
        flyTo(known[0], known[1]);
        return;
      }
      if (typeof navigator === "undefined" || !navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          apply(pos.coords.longitude, pos.coords.latitude);
          flyTo(pos.coords.longitude, pos.coords.latitude);
        },
        () => {
          /* denied/unavailable — stay put, no error surfaced */
        },
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 },
      );
    };

    const control = new LocateControl(handleLocate);
    map.addControl(control, "bottom-right");

    const watchId = navigator.geolocation.watchPosition(
      (pos) => apply(pos.coords.longitude, pos.coords.latitude),
      () => {
        /* permission denied / position unavailable — keep the dot hidden */
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      try {
        map.removeControl(control);
      } catch {
        /* map already torn down by its own effect cleanup */
      }
      marker?.remove();
      marker = null;
      userCoordRef.current = null;
    };
  }, [showUserLocation]);

  return <div ref={containerRef} className={cn("h-full w-full", className)} />;
}
