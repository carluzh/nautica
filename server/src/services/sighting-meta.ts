// Off-chain sighting metadata the on-chain event does not carry (kept out of the
// contract to avoid a redeploy). Keyed by the recording txHash (lowercased), which
// prefixes the subgraph sighting id (`txHash-logIndex`) — so a subgraph-read gallery
// item can recover it in normalizeSighting. Process-memory only; fine for the demo.

const radiusByTx = new Map<string, number>();

export function setSightingRadius(txHash: string, radiusM: number): void {
  radiusByTx.set(txHash.toLowerCase(), radiusM);
}

export function getSightingRadius(txHash: string): number | undefined {
  return radiusByTx.get(txHash.toLowerCase());
}
