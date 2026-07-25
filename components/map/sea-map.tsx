"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type Map as MLMap, type LngLatLike } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";

// CARTO Positron — a clean, light, low-noise basemap (soft water + muted land),
// keyless. The airy, Airbnb-listing feel that makes the teal markers pop.
const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const TEAL = "oklch(0.702 0.132 194)";

export type SeaMarker = {
  id: string;
  lng: number;
  lat: number;
  /** Accent color (token var or color); defaults to the teal primary. */
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markerObjs.current.forEach((m) => m.remove());
    markerObjs.current = markers.map((mk) => {
      const color = mk.color ?? TEAL;
      const el = document.createElement("button");
      el.className = "nautica-sea-marker";
      el.style.cssText = [
        "width:22px",
        "height:22px",
        "border-radius:9999px",
        "background:#ffffff",
        `border:2px solid ${color}`,
        "box-shadow:0 3px 10px rgba(23,43,54,0.22)",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "padding:0",
        "cursor:pointer",
      ].join(";");
      const dot = document.createElement("span");
      dot.style.cssText = `width:8px;height:8px;border-radius:9999px;background:${color};`;
      el.appendChild(dot);
      if (mk.label) el.title = mk.label;
      if (mk.onClick) el.addEventListener("click", () => mk.onClick?.(mk.id));
      return new maplibregl.Marker({ element: el }).setLngLat([mk.lng, mk.lat]).addTo(map);
    });
  }, [markers]);

  return <div ref={containerRef} className={cn("h-full w-full", className)} />;
}
