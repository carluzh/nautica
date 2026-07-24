import { SeaMap, type SeaMarker } from "@/components/map/sea-map";

// A few points along the Lisbon coast, purely decorative signal for the hero.
const HERO_MARKERS: SeaMarker[] = [
  { id: "carcavelos", lng: -9.337, lat: 38.679, label: "Praia de Carcavelos" },
  { id: "cascais", lng: -9.42, lat: 38.697, label: "Cascais" },
  { id: "caparica", lng: -9.229, lat: 38.644, label: "Costa da Caparica" },
  { id: "estoril", lng: -9.397, lat: 38.705, label: "Estoril" },
  { id: "sesimbra", lng: -9.101, lat: 38.444, label: "Sesimbra" },
  { id: "ericeira", lng: -9.417, lat: 38.963, label: "Ericeira" },
];

export function HeroBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <SeaMap
        interactive={false}
        center={[-9.33, 38.6]}
        zoom={8.2}
        markers={HERO_MARKERS}
        className="h-full w-full"
      />
      {/* Dim the basemap so foreground copy stays legible. */}
      <div className="absolute inset-0 bg-background/45" />
      {/* Blend into the surrounding dark sections, top and bottom. */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/25 to-background" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/70 to-transparent" />
      {/* Teal depth glow. */}
      <div className="absolute left-1/2 top-[38%] h-[460px] w-[680px] max-w-[95vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[130px]" />
    </div>
  );
}
