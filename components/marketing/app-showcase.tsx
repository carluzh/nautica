import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { SeaMap, type SeaMarker } from "@/components/map/sea-map";
import { cn } from "@/lib/utils";

// CARTO dark-matter — a dark basemap that echoes the in-app dark UI.
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const CORAL = "#FF6F61";

// Sighting points in risk colors. Red + purple sit close together just off the
// Lisbon coast (right side of the framed view); amber a little further out.
const MARKERS: SeaMarker[] = [
  // Red + purple sit close together just off the Lisbon coast (in the sea).
  { id: "hazard", lng: -9.25, lat: 38.655, color: "#F0506E", label: "Hazard" },
  { id: "rare", lng: -9.265, lat: 38.647, color: "#A855F7", label: "Rare finding" },
  { id: "invasive", lng: -9.31, lat: 38.69, color: "#F5A524", label: "Invasive" },
];

/**
 * Dark "field map" hero — the app's real dark map fills a full-screen rounded box
 * (the logo lives inside it), colored live sighting points on the right, the
 * headline/CTAs on the left, and a little arc of floating polaroids at the bottom.
 */
export function AppShowcase() {
  return (
    <section className="relative px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-6 lg:px-8 lg:pb-8 lg:pt-8">
      <div className="relative flex min-h-[calc(100svh_-_2rem)] flex-col overflow-hidden rounded-[2rem] bg-[#0a1017] shadow-2xl ring-1 ring-white/10 sm:min-h-[calc(100svh_-_3rem)] lg:min-h-[calc(100svh_-_4rem)]">
        {/* The app map, on a dark basemap. */}
        <div className="nautica-live-map absolute inset-0">
          <SeaMap
            interactive={false}
            styleUrl={DARK_STYLE}
            center={[-9.33, 38.66]}
            zoom={10.5}
            markers={MARKERS}
            cluster={false}
            className="h-full w-full"
          />
        </div>

        {/* Legibility gradients: darken the left (behind the copy) and the top
            (behind the logo), leaving the right — where the live points sit — clear. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1017]/92 via-[#0a1017]/35 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0a1017]/85 to-transparent" />

        {/* Logo — inside the dark box, aligned with the headline. */}
        <nav className="relative z-20 flex items-center px-6 pt-6 sm:px-12 lg:px-16">
          <Wordmark href="/" size={40} className="text-xl text-white" />
        </nav>

        {/* Hero copy + CTAs. */}
        <div className="pointer-events-none relative z-10 flex flex-1 flex-col items-start justify-center px-6 py-12 text-left sm:px-12 lg:px-16">
          <h2 className="max-w-2xl text-balance text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Protect the ocean by taking pictures of it.
          </h2>
          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/70 sm:text-lg">
            Join a global network of ocean explorers mapping marine biodiversity.
            Complete daily photo quests, verify your sightings with AI, and earn
            USDC as you level up.
          </p>
          <div className="pointer-events-auto mt-8 flex flex-wrap items-center gap-3">
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
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              For researchers
            </Link>
          </div>
        </div>

        {/* Floating polaroids, arcing up from bottom-left toward the centre-right. */}
        <Polaroid src="/animals/seahorse.jpg" className="bottom-[9%] left-[44%]" rotate="-rotate-6" delay="0s" />
        <Polaroid src="/animals/turtle.jpg" className="bottom-[15%] left-[56%]" rotate="rotate-3" delay="0.8s" />
        <Polaroid src="/animals/seastar.png" className="bottom-[22%] left-[68%]" rotate="-rotate-3" delay="1.6s" />
      </div>
    </section>
  );
}

// A tilted, gently-floating polaroid; lifts on hover. The float lives on the
// outer wrapper and the tilt/hover on the inner figure so the transforms don't
// clobber each other.
function Polaroid({
  src,
  className,
  rotate,
  delay,
}: {
  src: string;
  className?: string;
  rotate: string;
  delay: string;
}) {
  return (
    <div
      className={cn("nautica-float absolute z-10 hidden md:block", className)}
      style={{ animationDelay: delay }}
      aria-hidden
    >
      <figure
        className={cn(
          "pointer-events-auto w-24 bg-white p-1.5 pb-4 shadow-xl transition-transform duration-300 hover:scale-105 lg:w-32",
          rotate,
        )}
      >
        <div className="relative aspect-square w-full overflow-hidden bg-neutral-200">
          <Image src={src} alt="" fill sizes="160px" className="object-cover" />
        </div>
      </figure>
    </div>
  );
}
