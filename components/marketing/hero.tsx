import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Editorial hero — a bright, airy "field-guide" collage: an uppercase headline
 * over reef photos, tilted polaroid snapshots, and sea creatures, an angled
 * "AI Species ID" tag, and the log-observation CTA. All decoration is
 * pointer-events-none and hidden on mobile so the headline stays clean.
 *
 * Two creature treatments:
 *  - Transparent PNGs (qualleneu, leopardhaineu, reef3transparent) render
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

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      {/* Faint oversized wordmark watermark for depth. */}
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[20vw] font-black leading-none tracking-tighter text-foreground/[0.03]">
          NAUTICA
        </span>
      </div>

      {/* Rainbow wrasse — commented out (isolating qualle + reef) */}
      {/* <Float src="/animals/rainbowwrasse.png" w={1372} h={768} className="left-[3%] top-[4%] w-40 -rotate-6 lg:w-48" /> */}

      {/* ---- Star 1: reef1 (rounded) + jellyfish swimming out LEFT. ---- */}
      <div className="pointer-events-none absolute left-[58%] top-[22%] z-[20] hidden h-64 w-[20rem] md:block lg:h-[22rem] lg:w-[26rem]">
        <div className="absolute inset-0 overflow-hidden rounded-3xl shadow-xl ring-1 ring-black/5">
          <Image src="/animals/reef1.jpg" alt="" fill sizes="420px" className="object-cover" />
        </div>
        {/* Jellyfish, mirrored, swimming out the top-left. */}
        <Image
          src="/animals/qualleneu.png"
          alt=""
          width={1372}
          height={768}
          sizes="560px"
          className="absolute -left-[70%] -top-[60%] w-[165%] max-w-none -scale-x-100 select-none drop-shadow-2xl"
          style={{
            // Mirrored element (-scale-x-100), so a local "to top right" fade
            // reads as a soft fade-out toward the bottom-right on screen.
            WebkitMaskImage: "linear-gradient(to top right, transparent 0%, black 42%)",
            maskImage: "linear-gradient(to top right, transparent 0%, black 42%)",
          }}
        />
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
