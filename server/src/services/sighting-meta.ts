// Off-chain sighting metadata the on-chain event does not carry (kept out of the
// contract to avoid a redeploy). Keyed by the recording txHash (lowercased), which
// prefixes the subgraph sighting id (`txHash-logIndex`) - so a subgraph-read gallery
// item can recover it in normalizeSighting. Process-memory only; fine for the demo.

const radiusByTx = new Map<string, number>();

export function setSightingRadius(txHash: string, radiusM: number): void {
  radiusByTx.set(txHash.toLowerCase(), radiusM);
}

export function getSightingRadius(txHash: string): number | undefined {
  return radiusByTx.get(txHash.toLowerCase());
}

// Recording txHash -> stored image id (content-addressed). Lets a subgraph-read gallery
// item recover its photo - the image lives in the server store / 0G Storage, not on-chain.
const imageByTx = new Map<string, string>();

export function setSightingImage(txHash: string, imageId: string): void {
  imageByTx.set(txHash.toLowerCase(), imageId);
}

export function getSightingImage(txHash: string): string | undefined {
  return imageByTx.get(txHash.toLowerCase());
}

// Stored image id -> 0G Storage root hash (decentralized provenance), set once uploaded.
const imageRootById = new Map<string, string>();

export function setSightingImageRoot(imageId: string, root: string): void {
  imageRootById.set(imageId, root);
}

export function getSightingImageRoot(imageId: string): string | undefined {
  return imageRootById.get(imageId);
}
