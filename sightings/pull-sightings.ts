/**
 * Nautica real community sightings puller. One-shot, re-runnable build step:
 *
 *     npx tsx sightings/pull-sightings.ts
 *
 * Pulls research-grade iNaturalist observations (open, keyless) for the Lisbon
 * coast + Mallorca, normalizes them onto the `Sighting` type, and writes a
 * committed JSON the map ingests. Querying PER CATEGORY by taxon_id (descendants
 * included) makes every observation correct-by-construction on SpeciesId and
 * keeps the coastal box from flooding with terrestrial taxa; each group is capped
 * for a balanced, smoothly-clustering map.
 */
import { writeFileSync } from "node:fs";
import type { Sighting, SpeciesId } from "../lib/game/types";

const REGIONS = [
  { name: "Lisbon coast", swlat: 38.4, swlng: -9.6, nelat: 39.0, nelng: -9.05 },
  { name: "Mallorca", swlat: 39.2, swlng: 2.3, nelat: 40.0, nelng: 3.5 },
];

const UA = "Nautica/0.1 (ETHGlobal Lisbon hackathon; contact: lerhinox@gmail.com)";

// taxon_id lists from the iNaturalist taxonomy (comma = union, descendants
// included); `cap` is the max pulled per region, most recent first.
const GROUPS: { species: SpeciesId; taxa: string; cap: number }[] = [
  { species: "ShoreFish", taxa: "47178", cap: 42 }, // Actinopterygii (ray-finned fish)
  { species: "Crab", taxa: "121639", cap: 26 }, // Brachyura (true crabs)
  { species: "Jellyfish", taxa: "48332", cap: 26 }, // Scyphozoa (true jellyfish)
  { species: "Physalia", taxa: "117305", cap: 30 }, // Physalia (Portuguese man o' war)
  { species: "SeaStar", taxa: "47668", cap: 20 }, // Asteroidea (sea stars)
  { species: "Turtle", taxa: "39657,39619", cap: 12 }, // Cheloniidae + Dermochelyidae (sea turtles only)
  // Seagrass + marine algae. Capped small: plants otherwise dominate the map.
  { species: "ShorePlant", taxa: "118944,52616,48220,50863,57774", cap: 6 },
  { species: "Lionfish", taxa: "47284", cap: 12 }, // Pterois (invasive); likely 0 here
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
    per_page: String(Math.min(g.cap, 200)),
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
        out.push({
          id,
          species: g.species,
          lng,
          lat,
          label: `${common} · ${o.place_guess ?? r.name}`,
          ...(Number.isFinite(at) ? { at } : {}),
          ...(photo ? { photo, attribution } : {}),
        });
      }
      // iNat etiquette: < 1 request/second.
      await new Promise((res) => setTimeout(res, 1100));
    }
  }
  return out;
}

async function main() {
  const out = await build();
  const dist: Record<string, number> = {};
  for (const s of out) dist[s.species] = (dist[s.species] ?? 0) + 1;
  writeFileSync(new URL("./sightings.real.json", import.meta.url), JSON.stringify(out, null, 2));
  const withPhoto = out.filter((s) => s.photo).length;
  console.log(`Wrote ${out.length} sightings (withPhoto=${withPhoto})`);
  console.log("Species distribution:", dist);
}

// No top-level await: keeps `npx tsx` happy even under esbuild's CJS output
// (package.json has no "type":"module").
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
