import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// Off-chain sighting metadata the on-chain event does not carry (kept out of the
// contract to avoid a redeploy). Keyed by the recording txHash (lowercased), which
// prefixes the subgraph sighting id (`txHash-logIndex`) - so a subgraph-read gallery
// item can recover it in normalizeSighting.
//
// Disk-backed: these maps used to be process-memory only, which meant every server
// restart silently blanked out gallery photos served via the subgraph path. Same
// atomic write pattern as lib/store.ts (tmp + rename), low write volume.

const META_FILE = process.env.SIGHTING_META_FILE ?? "./.data/sighting-meta.json";

const radiusByTx = new Map<string, number>();
const imageByTx = new Map<string, string>();
const imageRootById = new Map<string, string>();

try {
  const d = JSON.parse(readFileSync(META_FILE, "utf8")) as {
    radiusByTx?: [string, number][];
    imageByTx?: [string, string][];
    imageRootById?: [string, string][];
  };
  for (const [k, v] of d.radiusByTx ?? []) radiusByTx.set(k, v);
  for (const [k, v] of d.imageByTx ?? []) imageByTx.set(k, v);
  for (const [k, v] of d.imageRootById ?? []) imageRootById.set(k, v);
} catch {
  /* no meta file yet - start empty */
}

function save(): void {
  try {
    mkdirSync(dirname(META_FILE), { recursive: true });
    const tmp = `${META_FILE}.tmp`;
    writeFileSync(
      tmp,
      JSON.stringify({
        radiusByTx: [...radiusByTx],
        imageByTx: [...imageByTx],
        imageRootById: [...imageRootById],
      }),
    );
    renameSync(tmp, META_FILE);
  } catch {
    /* disk write failed - keep serving from memory */
  }
}

export function setSightingRadius(txHash: string, radiusM: number): void {
  radiusByTx.set(txHash.toLowerCase(), radiusM);
  save();
}

export function getSightingRadius(txHash: string): number | undefined {
  return radiusByTx.get(txHash.toLowerCase());
}

export function setSightingImage(txHash: string, imageId: string): void {
  imageByTx.set(txHash.toLowerCase(), imageId);
  save();
}

export function getSightingImage(txHash: string): string | undefined {
  return imageByTx.get(txHash.toLowerCase());
}

export function setSightingImageRoot(imageId: string, root: string): void {
  imageRootById.set(imageId, root);
  save();
}

export function getSightingImageRoot(imageId: string): string | undefined {
  return imageRootById.get(imageId);
}
