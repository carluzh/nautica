// Small presentation helpers shared across panels.

/** 0G chain explorer (for TEE provider + signer addresses on the attestation). */
export const CHAINSCAN = "https://chainscan.0g.ai";
export const chainscanAddress = (addr: string) => `${CHAINSCAN}/address/${addr}`;

/** "0x1234…abcd" truncation for on-chain addresses. */
export function shortAddr(addr: string, size = 4): string {
  return addr.length > 2 + size * 2 ? `${addr.slice(0, 2 + size)}…${addr.slice(-size)}` : addr;
}

/**
 * Compact "x min/h/d ago" from an epoch-ms timestamp vs now. Only rendered after
 * the client-side sign-in seeds data, so Date.now() stays hydration-safe.
 */
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
