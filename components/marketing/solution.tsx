import Image from "next/image";
import Link from "next/link";
import { SeaMap, type SeaMarker } from "@/components/map/sea-map";
import { SwimmingShark } from "@/components/marketing/swimming-shark";

const MARKERS: SeaMarker[] = [
  { id: "a", lng: -9.35, lat: 38.66, color: "#F0506E" },
  { id: "b", lng: -9.44, lat: 38.695, color: "#F5A524" },
  { id: "c", lng: -9.245, lat: 38.63, color: "#A855F7" },
];

/**
 * Screen 3 — show the product + close. Two "who it's for" cards, then a narrow
 * reef-text CTA over the real dark-matter map, then a thin "Built with" trust row.
 */
export function Solution() {
  return (
    <section id="how" className="scroll-mt-20 py-14 lg:py-20">
      <div className="px-4 sm:px-6 lg:px-8">
        {/* (a) Two sides — who it's for */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* LEFT — For citizen scientists */}
          <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
            <p className="text-sm font-medium text-[#FF6F61]">
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
            <p className="text-sm font-medium text-[#FF6F61]">
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

        {/* Leopard shark swimming under the two-column cards */}
        <SwimmingShark />

        {/* (b) Thin reef-text CTA bar over the real map, with the rainbow
            wrasse overlapping its bottom-left in front */}
        <div className="relative mx-auto mt-12 max-w-2xl">
          <div className="relative overflow-hidden rounded-3xl bg-[#0a1017] ring-1 ring-white/10">
            <SeaMap
              interactive={false}
              cluster={false}
              styleUrl="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
              center={[-9.34, 38.66]}
              zoom={10}
              className="absolute inset-0 h-full w-full"
              markers={MARKERS}
            />

            {/* Strong dark overlay for legibility */}
            <div className="pointer-events-none absolute inset-0 bg-black/70" />

            {/* Slim centered reef-filled CTA bar */}
            <div className="relative z-10 flex items-center justify-center px-6 py-6 text-center">
              <Link
                href="/app"
                className="text-3xl font-bold lg:text-5xl"
                style={{
                  backgroundImage: "url(/animals/reef2.jpg)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                  WebkitTextFillColor: "transparent",
                  WebkitTextStroke: "1.5px #ffffff",
                }}
              >
                Log your first sighting →
              </Link>
            </div>
          </div>

          <Image
            src="/animals/rainbowwrasse.png"
            alt=""
            width={1372}
            height={768}
            sizes="240px"
            className="pointer-events-none absolute -bottom-8 -left-10 z-20 w-40 select-none drop-shadow-lg lg:w-52"
          />
        </div>

        {/* (c) Thin trust row — last, before the footer */}
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
