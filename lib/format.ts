// Small presentation helpers shared across panels.

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
