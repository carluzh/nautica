import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { SeaMap, type SeaMarker } from "@/components/map/sea-map";
import { cn } from "@/lib/utils";
import { REAL_SIGHTINGS } from "@/sightings";
import { CATEGORY_META, CATEGORY_ORDER, speciesCategory } from "@/lib/game/content";

const CORAL = "#FF6F61";

// Mirror the in-app map's category colors + clustering so the hero reads as the real map.
const CLUSTER_CATEGORIES = CATEGORY_ORDER.map((c) => ({ key: c, color: CATEGORY_META[c].color }));

// Hide the sighting cluster sitting on the basemap's "Lisboa" label (marketing map only).
const onLisbonLabel = (s: { lat: number; lng: number }) =>
  s.lat >= 38.704 && s.lat <= 38.709 && s.lng >= -9.14 && s.lng <= -9.133;

// Sightings hidden from the marketing preview only (awkward placement in the framed view).
const HIDDEN_IDS = new Set(["inat-383335628"]);

const SIGHTING_MARKERS: SeaMarker[] = REAL_SIGHTINGS.filter(
  (s) => !HIDDEN_IDS.has(s.id) && !onLisbonLabel(s),
).map((s) => {
  const category = speciesCategory(s.species);
  return { id: s.id, lng: s.lng, lat: s.lat, category, color: CATEGORY_META[category].color, label: s.label };
});

export function AppShowcase() {
  return (
    <section className="relative px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-6 lg:px-8 lg:pb-8 lg:pt-8">
      <div className="relative flex min-h-[calc(100svh_-_2rem)] flex-col overflow-hidden rounded-[2rem] bg-[#0a1017] shadow-2xl ring-1 ring-white/10 sm:min-h-[calc(100svh_-_3rem)] lg:min-h-[calc(100svh_-_4rem)]">
        <div className="absolute inset-0">
          <SeaMap
            interactive={false}
            dark
            clusterCategories={CLUSTER_CATEGORIES}
            center={[-9.31, 38.67]}
            zoom={10.5}
            markers={SIGHTING_MARKERS}
            className="h-full w-full"
          />
        </div>

        {/* Legibility gradients: darken the left (copy) and top (logo), keep the right (points) clear. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1017]/92 via-[#0a1017]/35 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0a1017]/85 to-transparent" />

        <nav className="relative z-20 flex items-center px-6 pt-4 sm:px-12 sm:pt-9 lg:px-16 lg:pt-12">
          <Wordmark href="/" size={40} className="text-3xl text-white" />
        </nav>

        <div className="pointer-events-none relative z-10 flex flex-1 flex-col items-start justify-center -mt-12 px-6 py-12 text-left sm:-mt-16 sm:px-12 lg:px-16">
          <h2 className="max-w-2xl text-balance text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-7xl">
            Protect the ocean by taking pictures of it.
          </h2>
          <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-white/70 sm:text-xl">
            Join a global network of ocean explorers <em className="italic">mapping marine biodiversity</em>.
            Complete daily photo quests, verify your sightings with AI, and earn
            XP as you level up.
          </p>
          <div className="pointer-events-auto mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/app"
              className="group inline-flex items-center rounded-full px-7 py-3.5 text-sm font-extrabold text-white shadow-lg"
              style={{ backgroundColor: CORAL }}
            >
              Launch App
              {/* Collapsed to w-0 until hover, so the button hugs its label. */}
              <span className="inline-flex w-0 items-center overflow-hidden transition-all duration-300 ease-out group-hover:w-[1.375rem]">
                <ArrowRight className="ml-1.5 size-4 -translate-x-1 opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100" />
              </span>
            </Link>
          </div>
        </div>

        <Polaroid src="/animals/seahorse.jpg" className="bottom-[6%] right-[31%]" rotate="-rotate-6" delay="0s" />
        <Polaroid src="/animals/turtle.jpg" className="bottom-[13%] right-[15%]" rotate="rotate-3" delay="0.8s" />
        <Polaroid src="/animals/seastar.png" className="bottom-[34%] right-[1%]" rotate="-rotate-3" delay="1.6s" />
      </div>
    </section>
  );
}

// Float lives on the outer wrapper and the tilt/hover on the inner figure so
// the two transforms don't clobber each other.
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
          "pointer-events-auto relative w-32 rounded-[6px] border border-black/10 bg-stone-300 p-2 pb-6 shadow-xl transition-transform duration-300 hover:z-10 hover:rotate-0 hover:scale-110 lg:w-44",
          rotate,
        )}
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-[3px] bg-muted">
          <Image src={src} alt="" fill sizes="240px" className="object-cover" />
        </div>
        <span className="absolute inset-x-0 bottom-[9px] flex items-center justify-center gap-[3px]">
          {[0, 1, 2].map((d) => (
            <span key={d} className="size-[4px] rounded-full bg-[#4a473f] opacity-75" />
          ))}
        </span>
      </figure>
    </div>
  );
}
