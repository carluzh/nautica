import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SeaMap, type SeaMarker } from "@/components/map/sea-map";

// CARTO dark-matter — a dark basemap that echoes the in-app dark UI.
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const CORAL = "#FF6F61";

// Three offshore points in the risk colors: hazard (red), invasive (amber),
// rare find (purple).
const MARKERS: SeaMarker[] = [
  // Red + purple sit close together on the Lisbon (Carcavelos) coast; amber a bit west.
  { id: "hazard", lng: -9.335, lat: 38.672, color: "#F0506E", label: "Hazard" },
  { id: "rare", lng: -9.353, lat: 38.664, color: "#A855F7", label: "Rare find" },
  { id: "invasive", lng: -9.442, lat: 38.702, color: "#F5A524", label: "Invasive" },
];

const LEGEND = [
  { color: "#F0506E", label: "Hazard" },
  { color: "#F5A524", label: "Invasive" },
  { color: "#A855F7", label: "Rare find" },
];

/**
 * Dark "field map" showcase band — brings the app's dark map design onto the
 * marketing page: the real SeaMap on a dark basemap with three colored sighting
 * points, a headline and CTA floating over it (a dark hero panel in the style of
 * the reference landing page).
 */
export function AppShowcase() {
  return (
    <section className="px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-6 lg:px-8 lg:pb-8 lg:pt-8">
      <div className="relative flex min-h-[calc(100svh_-_6rem)] flex-col overflow-hidden rounded-[2rem] bg-[#0a1017] shadow-2xl ring-1 ring-white/10 sm:min-h-[calc(100svh_-_7rem)] lg:min-h-[calc(100svh_-_8rem)]">
        {/* The app map, on a dark basemap. */}
        <div className="nautica-live-map absolute inset-0">
          <SeaMap
            interactive={false}
            styleUrl={DARK_STYLE}
            center={[-9.34, 38.66]}
            zoom={10.4}
            markers={MARKERS}
            cluster={false}
            className="h-full w-full"
          />
        </div>

        {/* Legibility gradient over the map. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0a1017]/80 via-[#0a1017]/35 to-[#0a1017]/90" />

        {/* Content. */}
        <div className="relative z-10 flex flex-1 flex-col items-start justify-center px-6 py-16 text-left sm:px-12 lg:px-16">
          <h2 className="max-w-2xl text-balance text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Help protect what you love.
          </h2>

          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/70 sm:text-lg">
            Join a global network of ocean explorers mapping marine biodiversity.
            Complete daily photo quests, verify your sightings with AI, and earn
            USDC as you level up.
          </p>

          <div className="mt-8 flex flex-col items-start gap-3">
            <Link
              href="/app"
              className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: CORAL }}
            >
              Open the app
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/pro"
              className="inline-flex items-center gap-1 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              For researchers
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="mt-9 flex flex-wrap items-center justify-start gap-x-6 gap-y-2">
            {LEGEND.map((l) => (
              <span
                key={l.label}
                className="inline-flex items-center gap-2 text-xs font-medium text-white/75"
              >
                <span
                  className="size-2.5 rounded-full ring-2 ring-white/25"
                  style={{ backgroundColor: l.color }}
                />
                {l.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
