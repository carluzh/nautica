"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map as MLMap } from "maplibre-gl";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { Crosshair, Loader2, MapPin } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { PickedPlace } from "@/lib/game/types";

export type { PickedPlace };

// Match the app's dark basemap (components/map/sea-map.tsx): CARTO Dark Matter with
// a slightly blue water fill. Kept self-contained so it never touches that component.
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const WATER_BLUE = "#12314c";
const LISBON: [number, number] = [-9.15, 38.7];

/** Anti-spoof leash: the chosen spot must sit within this many km of the live GPS fix. */
export const MAX_PLACEMENT_KM = 5;
const MIN_RADIUS_M = 100;
const MAX_RADIUS_M = 2000;
const DEFAULT_RADIUS_M = 250;
const PIN_HEX = "#0e9bb0"; // teal pin, matching the app primary closely enough
const ZONE_HEX = "#64748b"; // neutral slate for the placement leash

const R_EARTH = 6_371_000;
function haversineM(a: [number, number], b: [number, number]): number {
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const la1 = (a[1] * Math.PI) / 180;
  const la2 = (b[1] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(h));
}

/** Clamp a point to within maxM of the anchor (linear in lng/lat — fine at these scales). */
function clampToZone(spot: [number, number], anchor: [number, number], maxM: number): [number, number] {
  const d = haversineM(anchor, spot);
  if (d <= maxM || d === 0) return spot;
  const t = maxM / d;
  return [anchor[0] + (spot[0] - anchor[0]) * t, anchor[1] + (spot[1] - anchor[1]) * t];
}

/** A geographic circle polygon (meters), so it scales correctly with zoom. */
function circle(center: [number, number], radiusM: number, id: string, steps = 72): Feature<Polygon> {
  const [lng, lat] = center;
  const latR = radiusM / 111_320;
  const lngR = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    ring.push([lng + lngR * Math.cos(a), lat + latR * Math.sin(a)]);
  }
  return { type: "Feature", properties: { id }, geometry: { type: "Polygon", coordinates: [ring] } };
}

function shapes(
  anchor: [number, number] | null,
  spot: [number, number],
  radiusM: number,
): FeatureCollection<Polygon> {
  const features: Feature<Polygon>[] = [circle(spot, radiusM, "radius")];
  if (anchor) features.unshift(circle(anchor, MAX_PLACEMENT_KM * 1000, "zone"));
  return { type: "FeatureCollection", features };
}

function fmtRadius(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

/** GPS-anchored location picker for a quest submission. The pin starts at the live
 *  GPS fix and can be dragged, but is clamped to within MAX_PLACEMENT_KM of that fix
 *  (anti-spoof leash). A slider sets the precision radius. Emits on every change. */
export function LocationPicker({
  onChange,
  className,
}: {
  onChange: (place: PickedPlace) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const anchorRef = useRef<[number, number] | null>(null);
  const spotRef = useRef<[number, number]>(LISBON);
  const radiusRef = useRef<number>(DEFAULT_RADIUS_M);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [radiusM, setRadiusM] = useState(DEFAULT_RADIUS_M);
  const [gpsState, setGpsState] = useState<"locating" | "ok" | "denied">("locating");
  const [coords, setCoords] = useState<[number, number]>(LISBON);

  const emit = () => {
    const [lng, lat] = spotRef.current;
    const anchor = anchorRef.current;
    onChangeRef.current({
      lat,
      lng,
      radiusM: radiusRef.current,
      anchorLat: anchor?.[1],
      anchorLng: anchor?.[0],
      gpsAnchored: Boolean(anchor),
    });
  };

  const paint = () => {
    const src = mapRef.current?.getSource("picker") as GeoJSONSource | undefined;
    src?.setData(shapes(anchorRef.current, spotRef.current, radiusRef.current));
  };

  // Map init (once). The marker + circle layers are imperative; React state drives
  // only the slider, the coords readout and the GPS status line.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: LISBON,
      zoom: 11,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    // Dialogs mount at zero size then animate open — keep the canvas in sync.
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    const marker = new maplibregl.Marker({ draggable: true, color: PIN_HEX })
      .setLngLat(LISBON)
      .addTo(map);
    markerRef.current = marker;

    marker.on("drag", () => {
      const ll = marker.getLngLat();
      let next: [number, number] = [ll.lng, ll.lat];
      const anchor = anchorRef.current;
      if (anchor) {
        const clamped = clampToZone(next, anchor, MAX_PLACEMENT_KM * 1000);
        if (clamped[0] !== next[0] || clamped[1] !== next[1]) {
          next = clamped;
          marker.setLngLat(next);
        }
      }
      spotRef.current = next;
      paint();
    });
    marker.on("dragend", () => {
      setCoords(spotRef.current);
      emit();
    });

    map.on("load", () => {
      // Match the app map's blue-ish water.
      if (map.getLayer("water")) {
        try {
          map.setPaintProperty("water", "fill-color", WATER_BLUE);
        } catch {
          /* water layer shape differs on this style version — ignore */
        }
      }
      map.addSource("picker", { type: "geojson", data: shapes(null, LISBON, DEFAULT_RADIUS_M) });
      map.addLayer({
        id: "zone-fill",
        type: "fill",
        source: "picker",
        filter: ["==", ["get", "id"], "zone"],
        paint: { "fill-color": ZONE_HEX, "fill-opacity": 0.06 },
      });
      map.addLayer({
        id: "zone-line",
        type: "line",
        source: "picker",
        filter: ["==", ["get", "id"], "zone"],
        paint: { "line-color": ZONE_HEX, "line-opacity": 0.5, "line-width": 1, "line-dasharray": [2, 2] },
      });
      map.addLayer({
        id: "radius-fill",
        type: "fill",
        source: "picker",
        filter: ["==", ["get", "id"], "radius"],
        paint: { "fill-color": PIN_HEX, "fill-opacity": 0.16 },
      });
      map.addLayer({
        id: "radius-line",
        type: "line",
        source: "picker",
        filter: ["==", ["get", "id"], "radius"],
        paint: { "line-color": PIN_HEX, "line-opacity": 0.7, "line-width": 1.5 },
      });
      paint();

      // Fresh GPS fix -> becomes the anchor + initial spot. Denied/absent degrades to
      // a free pick centered on Lisbon (gpsAnchored:false), no leash.
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const fix: [number, number] = [pos.coords.longitude, pos.coords.latitude];
            anchorRef.current = fix;
            spotRef.current = fix;
            marker.setLngLat(fix);
            map.flyTo({ center: fix, zoom: 14, duration: 800 });
            setGpsState("ok");
            setCoords(fix);
            paint();
            emit();
          },
          () => {
            setGpsState("denied");
            emit();
          },
          { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
        );
      } else {
        setGpsState("denied");
        emit();
      }
    });

    return () => {
      ro.disconnect();
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRadius = (v: number) => {
    radiusRef.current = v;
    setRadiusM(v);
    paint();
    emit();
  };

  return (
    <div className={cn("flex h-full flex-col gap-2", className)}>
      <div className="relative min-h-[11rem] flex-1 overflow-hidden rounded-lg border">
        <div ref={containerRef} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-background/90 to-transparent px-2.5 py-1.5 text-[11px]">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            {gpsState === "locating" ? (
              <>
                <Loader2 className="size-3 animate-spin" /> Locating…
              </>
            ) : gpsState === "ok" ? (
              <>
                <Crosshair className="size-3 text-primary" /> Within {MAX_PLACEMENT_KM} km of you
              </>
            ) : (
              <>
                <MapPin className="size-3 text-warning" /> GPS off · pick a spot
              </>
            )}
          </span>
          <span className="tnum text-muted-foreground">
            {coords[1].toFixed(4)}, {coords[0].toFixed(4)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-[11px] text-muted-foreground">Radius</span>
        <Slider
          value={[radiusM]}
          min={MIN_RADIUS_M}
          max={MAX_RADIUS_M}
          step={50}
          onValueChange={([v]) => onRadius(v)}
          className="flex-1"
        />
        <span className="tnum w-14 shrink-0 text-right text-[11px] font-medium">{fmtRadius(radiusM)}</span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Drag the pin to where you saw it. The circle sets how precise you want to be.
      </p>
    </div>
  );
}
