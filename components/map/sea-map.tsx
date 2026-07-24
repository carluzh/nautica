"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type Map as MLMap, type LngLatLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";

// CARTO dark-matter — free, keyless vector basemap. Ideal for a dark ocean UI.
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export type SeaMarker = {
  id: string;
  lng: number;
  lat: number;
  /** Optional accent color; defaults to the teal primary. */
  color?: string;
  label?: string;
  onClick?: (id: string) => void;
};

export function SeaMap({
  className,
  center = [-9.15, 38.7], // Lisbon coast
  zoom = 8,
  markers = [],
  interactive = true,
  onReady,
}: {
  className?: string;
  center?: LngLatLike;
  zoom?: number;
  markers?: SeaMarker[];
  interactive?: boolean;
  onReady?: (map: MLMap) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerObjs = useRef<maplibregl.Marker[]>([]);

  // Init once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
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
    // Init args are intentionally read once; live updates handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconcile markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerObjs.current.forEach((m) => m.remove());
    markerObjs.current = markers.map((mk) => {
      const el = document.createElement("button");
      el.className = "nautica-sea-marker";
      el.style.cssText = `width:14px;height:14px;border-radius:9999px;border:2px solid var(--background);background:${
        mk.color ?? "oklch(0.802 0.126 187)"
      };box-shadow:0 0 0 3px color-mix(in oklch, ${
        mk.color ?? "oklch(0.802 0.126 187)"
      } 30%, transparent);cursor:pointer;`;
      if (mk.label) el.title = mk.label;
      if (mk.onClick) el.addEventListener("click", () => mk.onClick?.(mk.id));
      return new maplibregl.Marker({ element: el }).setLngLat([mk.lng, mk.lat]).addTo(map);
    });
  }, [markers]);

  return <div ref={containerRef} className={cn("h-full w-full", className)} />;
}
