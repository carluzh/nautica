import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SeaMap, type SeaMarker } from "@/components/map/sea-map";

const MARKERS: SeaMarker[] = [
  { id: "a", lng: -9.35, lat: 38.66, color: "#F0506E" },
  { id: "b", lng: -9.44, lat: 38.695, color: "#F5A524" },
  { id: "c", lng: -9.245, lat: 38.63, color: "#A855F7" },
];

/**
 * Screen 3 — show the product + close. A dark panel over the real dark-matter
 * map with the two-sided value line and CTAs, then a thin "Built with" trust row.
 */
export function Solution() {
  return (
    <section id="how" className="scroll-mt-20 py-14 lg:py-20">
      <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-10">
        {/* (a) Dark product panel showing the real map */}
        <div className="relative min-h-[24rem] overflow-hidden rounded-3xl bg-[#0a1017] ring-1 ring-white/10 lg:min-h-[28rem]">
          <SeaMap
            interactive={false}
            cluster={false}
            styleUrl="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
            center={[-9.34, 38.66]}
            zoom={10}
            className="absolute inset-0 h-full w-full"
            markers={MARKERS}
          />

          {/* Legibility gradient over the map */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a1017]/95 via-[#0a1017]/40 to-transparent" />

          {/* Overlaid content, bottom-left */}
          <div className="relative z-10 flex min-h-[24rem] flex-col justify-end p-8 text-white lg:min-h-[28rem] lg:p-12">
            <p className="max-w-2xl text-2xl font-semibold leading-snug lg:text-3xl">
              One verified photo — a trophy in your gallery, and research-grade
              data for science.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/app"
                className="group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: "#FF6F61" }}
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
          </div>
        </div>

        {/* (b) Two sides — who it's for */}
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
            <p className="text-sm font-medium text-primary">
              For citizen scientists
            </p>
            <h3 className="mt-1 text-xl font-semibold">
              Explore, log, get rewarded
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Turn a beach walk or a dive into something that counts. Log what
              you find, build a verified field gallery, climb the leaderboard,
              and earn USDC from Level 5.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
            <p className="text-sm font-medium text-primary">
              For researchers, agencies &amp; NGOs
            </p>
            <h3 className="mt-1 text-xl font-semibold">Data you can act on</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Post a quest and verified people go collect it. Every record
              arrives with World ID and 0G provenance, GBIF-ready — biodiversity
              data you can audit, act on, and fund.
            </p>
          </div>
        </div>

        {/* (c) Thin trust row */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs">
          <span className="text-muted-foreground">Built with</span>
          {["World ID", "0G", "The Graph"].map((name) => (
            <span
              key={name}
              className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 font-medium text-muted-foreground"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
