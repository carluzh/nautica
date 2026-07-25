import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SeaMap, type SeaMarker } from "@/components/map/sea-map";
import { cn } from "@/lib/utils";

/**
 * Editorial hero — a bright, airy "field-guide" collage: an uppercase headline
 * over reef photos, tilted polaroid snapshots, and sea creatures, an angled
 * "AI Species ID" tag, and the log-observation CTA. All decoration is
 * pointer-events-none and hidden on mobile so the headline stays clean.
 *
 * Two creature treatments:
 *  - Transparent PNGs (qualle, leopardhaineu, reef3transparent) render
 *    normally with a real drop-shadow.
 *  - White-background PNGs (rainbowwrasse, nudibranchwhite) drop their white
 *    via `mix-blend-multiply` (white × backdrop = backdrop) — `Float`.
 *
 * The two "stars" (reef + creature, and reef + creature + tag) are grouped in a
 * single positioned wrapper with PERCENT offsets, so the overlaps hold on every
 * screen size.
 */

// Brand coral — matches the logo mark; used for the CTA + AI-tag accents.
const CORAL = "#FF6F61";

// A few decorative points along the Lisbon coast for the hero's map card.
const HERO_MARKERS: SeaMarker[] = [
  { id: "carcavelos", lng: -9.337, lat: 38.679, label: "Carcavelos" },
  { id: "cascais", lng: -9.42, lat: 38.697, label: "Cascais" },
  { id: "caparica", lng: -9.229, lat: 38.644, label: "Caparica" },
  { id: "sesimbra", lng: -9.101, lat: 38.444, label: "Sesimbra" },
  { id: "ericeira", lng: -9.417, lat: 38.963, label: "Ericeira" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
{/* Rainbow wrasse — commented out (isolating qualle + reef) */}
      {/* <Float src="/animals/rainbowwrasse.png" w={1372} h={768} className="left-[3%] top-[4%] w-40 -rotate-6 lg:w-48" /> */}

      {/* ---- Star 1: reef1 (rounded), bottom-left by the text, jellyfish
             swimming UP out of it and fading into the reef at the bottom. ---- */}
      <div className="pointer-events-none absolute bottom-[6%] left-[1%] z-[20] hidden h-44 w-[13rem] md:block lg:h-[14rem] lg:w-[16rem]">
        <div className="absolute inset-0 overflow-hidden rounded-3xl shadow-xl ring-1 ring-black/5">
          <Image src="/animals/reef1.jpg" alt="" fill sizes="420px" className="object-cover" />
        </div>
        {/* Jellyfish, mirrored, swimming out the top-left. */}
        <Image
          src="/animals/qualle.png"
          alt=""
          width={1001}
          height={1121}
          sizes="560px"
          className="absolute -left-[52%] -top-[128%] w-[151%] max-w-none select-none drop-shadow-xl"
          style={{
            // Fade the lower tentacles out so the jellyfish looks like it rises
            // out of the reef instead of sitting on a hard edge.
            WebkitMaskImage: "linear-gradient(to top, transparent 0%, black 24%)",
            maskImage: "linear-gradient(to top, transparent 0%, black 24%)",
          }}
        />
      </div>

      {/* Semi-transparent field map on the right — echoes the in-app map. */}
      <div className="pointer-events-none absolute right-[5%] top-[20%] z-[6] hidden h-[20rem] w-[22rem] overflow-hidden rounded-3xl opacity-60 shadow-xl ring-1 ring-black/10 lg:block lg:h-[24rem] lg:w-[26rem]">
        <SeaMap
          interactive={false}
          center={[-9.33, 38.62]}
          zoom={8.6}
          markers={HERO_MARKERS}
          className="h-full w-full"
        />
        <div className="absolute inset-0 bg-background/20" />
      </div>

      {/* Polaroid snapshots — commented out (isolating qualle + reef) */}
      {/* <Polaroid src="/animals/seahorse.jpg" className="right-[7%] bottom-[26%] rotate-6" /> */}
      {/* <Polaroid src="/animals/seastar.png" className="right-[25%] bottom-[9%] rotate-3" /> */}
      {/* <Polaroid src="/animals/turtle.jpg" className="bottom-[4%] left-1/2 -translate-x-1/2 -rotate-2" /> */}

      {/* Nudibranch — commented out (isolating qualle + reef) */}
      {/* <Float src="/animals/nudibranchwhite.png" w={976} h={1085} className="right-[4%] bottom-[12%] w-28 rotate-6 lg:w-36" /> */}

      {/* Headline + CTA (shifted up). */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100svh_-_4rem)] max-w-6xl flex-col justify-start px-4 pb-24 pt-[13vh] sm:px-6">
        <h1 className="max-w-2xl text-balance text-4xl font-semibold uppercase leading-[0.95] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          Record, identify and map ocean biodiversity{" "}
          <span className="text-foreground/40">with Nautica</span>
        </h1>

        <div className="mt-9">
          <Link
            href="/app"
            className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition-transform hover:-translate-y-0.5"
            style={{ backgroundColor: CORAL }}
          >
            Log observation
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Event hashtag (small, bottom-right). */}
      <span className="pointer-events-none absolute bottom-[5%] right-[6%] z-10 select-none text-sm font-semibold tracking-tight text-foreground/55 sm:text-base">
        #ETHGlobal
      </span>
    </section>
  );
}

// Standalone creature on a white photo background — `mix-blend-multiply` drops
// the white against the cream page (no CSS drop-shadow: it would trace the
// opaque rectangle, not the animal). Intrinsic w/h keep the aspect correct.
function Float({
  src,
  w,
  h,
  className,
}: {
  src: string;
  w: number;
  h: number;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt=""
      width={w}
      height={h}
      sizes="400px"
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-[8] hidden h-auto max-w-none select-none mix-blend-multiply md:block",
        className,
      )}
    />
  );
}

// Rectangular "polaroid": white frame with a thicker bottom lip, soft shadow,
// tilted via the caller's rotate-* class. Photo is square-cropped.
function Polaroid({ src, className }: { src: string; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-[6] hidden w-28 bg-white p-2 shadow-xl ring-1 ring-black/5 md:block lg:w-36",
        className,
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        <Image src={src} alt="" fill sizes="200px" className="object-cover" />
      </div>
      <div className="h-4" />
    </div>
  );
}
