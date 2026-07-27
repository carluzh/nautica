/**
 * Nautica real community sightings puller. One-shot, re-runnable build step:
 *
 *     npx tsx sightings/pull-sightings.ts
 *
 * Pulls research-grade iNaturalist observations (open, keyless) for three
 * worldwide regions (Europe, Vietnam, Australia), normalizes them onto the
 * `Sighting` type, and writes a committed JSON the map ingests. Querying PER
 * CATEGORY by taxon_id (descendants included) makes every observation
 * correct-by-construction on SpeciesId and keeps the bounding boxes from
 * flooding with terrestrial taxa; each group is capped for a balanced,
 * smoothly-clustering map (Europe gets double caps, it is the biggest box).
 *
 * Covers 15 marine species groups: Physalia, Jellyfish, Anemone, Crab, Octopus,
 * SeaStar, Urchin, Nudibranch, Seahorse, Shark, Lionfish, Turtle, Dolphin,
 * ShorePlant, and the catch-all ShoreFish. Groups are deduped by observation id
 * in ARRAY ORDER (first group to claim an observation wins), so the more
 * specific ray-finned fish groups (Seahorse, Lionfish) MUST precede the broad
 * ShoreFish group (Actinopterygii), which is kept as the VERY LAST entry.
 */
import { readFileSync, writeFileSync } from "node:fs";
import type { Sighting, SpeciesId } from "../lib/game/types";

const OUT_FILE = new URL("./sightings.real.json", import.meta.url);
// Accumulate by default: each pull is UNIONED with the committed dataset (keyed by
// observation id) so no prior sighting is ever dropped by a later, differently-capped
// pull. This is what keeps hotspots (Mallorca, Lisbon) from thinning out over refreshes.
// Set FRESH=1 to bootstrap a clean base (used once to discard bad data).
const FRESH = process.env.FRESH === "1";
// Safety valve so the committed file cannot grow without bound; keeps the most recently
// observed. Set very high so ordinary accumulation never trims (dedup by stable iNat id
// means growth only comes from genuinely new observations).
const MAX_SIGHTINGS = 8000;

// `capScale` multiplies each group's cap for that region (iNat pages max out
// at 200, so the effective per_page is min(cap * capScale, 200)).
const REGIONS = [
  { name: "Europe", swlat: 34, swlng: -11, nelat: 71, nelng: 32, capScale: 2 },
  { name: "Vietnam", swlat: 8.2, swlng: 102, nelat: 23.5, nelng: 110.5, capScale: 1 },
  { name: "Australia", swlat: -44, swlng: 112, nelat: -9.5, nelng: 154.5, capScale: 1 },
  // Dense hotspot boxes (inside Europe) so the original demo areas stay well
  // populated; dedup by observation id means these only ADD local points.
  { name: "Lisbon coast", swlat: 38.4, swlng: -9.6, nelat: 39.0, nelng: -9.05, capScale: 3 },
  { name: "Mallorca", swlat: 39.2, swlng: 2.3, nelat: 40.0, nelng: 3.5, capScale: 3 },
];

const UA = "Nautica/0.1 (ETHGlobal Lisbon hackathon; contact: lerhinox@gmail.com)";

// taxon_id lists from the iNaturalist taxonomy (comma = union, descendants
// included); `cap` is the base max pulled per region (scaled by the region's
// `capScale`), most recent first.
// ORDERING IS LOAD-BEARING: dedup runs in array order, so every more-specific
// group must precede the broad ShoreFish (Actinopterygii) catch-all, which is
// therefore LAST. Seahorse (Syngnathidae) and Lionfish (Pterois) are ray-finned
// fish and would be swallowed by ShoreFish if it ran first.
const GROUPS: { species: SpeciesId; taxa: string; cap: number }[] = [
  { species: "Crab", taxa: "121639", cap: 26 }, // Brachyura (true crabs)
  { species: "Jellyfish", taxa: "48332", cap: 26 }, // Scyphozoa (true jellyfish)
  { species: "Physalia", taxa: "117305", cap: 30 }, // Physalia (Portuguese man o' war)
  { species: "SeaStar", taxa: "47668", cap: 20 }, // Asteroidea (starfish)
  { species: "Turtle", taxa: "39657,39619", cap: 12 }, // Cheloniidae + Dermochelyidae (sea turtles only)
  { species: "Shark", taxa: "47273", cap: 16 }, // Elasmobranchii (sharks + rays)
  { species: "Octopus", taxa: "47459", cap: 16 }, // Cephalopoda (octopus, squid, cuttlefish)
  { species: "Nudibranch", taxa: "47113", cap: 16 }, // Nudibranchia (sea slugs)
  { species: "Urchin", taxa: "47548", cap: 14 }, // Echinoidea (sea urchins)
  { species: "Anemone", taxa: "47797", cap: 12 }, // Actiniaria (sea anemones)
  { species: "Dolphin", taxa: "152871", cap: 10 }, // Cetacea (dolphins, whales)
  { species: "Seahorse", taxa: "49106", cap: 12 }, // Syngnathidae (seahorses, pipefish) - ray-finned, precede ShoreFish
  { species: "Lionfish", taxa: "47284", cap: 12 }, // Pterois (lionfish) - ray-finned, precede ShoreFish
  // Seagrass + marine algae. Capped small: plants otherwise dominate the map.
  { species: "ShorePlant", taxa: "118944,52616,48220,50863,57774", cap: 6 },
  // MUST BE LAST: Actinopterygii is the broad ray-finned fish catch-all.
  { species: "ShoreFish", taxa: "47178", cap: 42 }, // Actinopterygii (ray-finned fish)
];

// Only surface a photo when it carries a Creative-Commons license (occurrence
// facts are free, photos are not); everything else is a dot with no image.
const CC = new Set([
  "cc0",
  "cc-by",
  "cc-by-nc",
  "cc-by-sa",
  "cc-by-nd",
  "cc-by-nc-sa",
  "cc-by-nc-nd",
]);

/** Best CC-licensed photo for an observation (medium size), with attribution. */
function bestPhoto(o: any): { photo?: string; attribution?: string } {
  const p = (o.photos ?? [])[0];
  if (!p || !p.url || !CC.has(p.license_code)) return {};
  // iNat serves ".../<id>/square.jpg"; bump to medium for the popup.
  const photo = String(p.url).replace("/square.", "/medium.");
  const who = o.user?.login ? `© ${o.user.login}` : "iNaturalist";
  const lic = p.license_code ? ` · ${String(p.license_code).toUpperCase()}` : "";
  return { photo, attribution: `${who} · iNaturalist${lic}` };
}

async function fetchGroup(
  r: (typeof REGIONS)[number],
  g: (typeof GROUPS)[number],
): Promise<any[]> {
  const qs = new URLSearchParams({
    swlat: String(r.swlat),
    swlng: String(r.swlng),
    nelat: String(r.nelat),
    nelng: String(r.nelng),
    taxon_id: g.taxa,
    quality_grade: "research",
    geoprivacy: "open",
    photos: "true",
    per_page: String(Math.min(g.cap * r.capScale, 200)),
    order_by: "observed_on",
    order: "desc",
  });
  const res = await fetch(`https://api.inaturalist.org/v1/observations?${qs}`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`iNaturalist ${res.status} ${res.statusText} for ${r.name}/${g.species}`);
  const data = (await res.json()) as { results?: any[] };
  return data.results ?? [];
}

async function build(): Promise<Sighting[]> {
  const seen = new Set<string>();
  const out: Sighting[] = [];
  for (const r of REGIONS) {
    for (const g of GROUPS) {
      const results = await fetchGroup(r, g);
      for (const o of results) {
        const coords = o.geojson?.coordinates as [number, number] | undefined; // [lng, lat]
        if (!coords || !o.taxon) continue;
        const [lng, lat] = coords;
        // Clamp to the bounding box (obscured coords can drift slightly outside).
        if (lng < r.swlng || lng > r.nelng || lat < r.swlat || lat > r.nelat) continue;
        const id = `inat-${o.id}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const common: string = o.taxon.preferred_common_name || o.taxon.name || "Unknown";
        const at = o.observed_on ? Date.parse(o.observed_on) : NaN;
        const { photo, attribution } = bestPhoto(o);
        // Only keep sightings that carry a real (CC-licensed) photo - every map marker
        // should open an actual image, never a bare dot.
        if (!photo) continue;
        out.push({
          id,
          species: g.species,
          lng,
          lat,
          label: `${common} · ${o.place_guess ?? r.name}`,
          ...(Number.isFinite(at) ? { at } : {}),
          photo,
          attribution,
        });
      }
      // iNat etiquette: < 1 request/second.
      await new Promise((res) => setTimeout(res, 1100));
    }
  }
  return out;
}

async function main() {
  const pulled = await build();

  // Union with the existing committed dataset (never delete). New data refreshes or
  // adds; old entries the current pull did not re-include are preserved.
  const byId = new Map<string, Sighting>();
  if (!FRESH) {
    try {
      const existing = JSON.parse(readFileSync(OUT_FILE, "utf8")) as Sighting[];
      for (const s of existing) if (s.photo) byId.set(s.id, s);
    } catch {
      /* no existing dataset yet - start from this pull */
    }
  }
  const beforeMerge = byId.size;
  for (const s of pulled) byId.set(s.id, s);

  let all = [...byId.values()];
  let trimmed = 0;
  if (all.length > MAX_SIGHTINGS) {
    all.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
    trimmed = all.length - MAX_SIGHTINGS;
    all = all.slice(0, MAX_SIGHTINGS);
  }

  const dist: Record<string, number> = {};
  for (const s of all) dist[s.species] = (dist[s.species] ?? 0) + 1;
  writeFileSync(OUT_FILE, JSON.stringify(all, null, 2));
  console.log(
    `Pulled ${pulled.length}; dataset ${beforeMerge} -> ${all.length}` +
      (FRESH ? " (FRESH bootstrap)" : " (accumulated)") +
      (trimmed ? ` (trimmed ${trimmed} oldest over ${MAX_SIGHTINGS})` : ""),
  );
  console.log("Species distribution:", dist);
}

// No top-level await: keeps `npx tsx` happy even under esbuild's CJS output
// (package.json has no "type":"module").
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
