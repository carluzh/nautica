/** 0G chain explorer (for TEE provider + signer addresses on the attestation). */
export const CHAINSCAN = "https://chainscan.0g.ai";
export const chainscanAddress = (addr: string) => `${CHAINSCAN}/address/${addr}`;

/** Base Sepolia explorer (for recordCompletion tx hashes + addresses). */
export const BASESCAN = "https://sepolia.basescan.org";
export const basescanTx = (hash: string) => `${BASESCAN}/tx/${hash}`;
export const basescanAddress = (addr: string) => `${BASESCAN}/address/${addr}`;

export function shortAddr(addr: string, size = 4): string {
  return addr.length > 2 + size * 2 ? `${addr.slice(0, 2 + size)}…${addr.slice(-size)}` : addr;
}

// Only rendered after client-side sign-in seeds data, so Date.now() stays hydration-safe.
export function timeAgo(at: number): string {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.round(d / 7)}w ago`;
}
