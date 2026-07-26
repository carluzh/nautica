// XP → level curve. Mirrors the frontend (lib/game/levels.ts). The server is the
// source of truth for XP once the subgraph/chain are live; the frontend curve is
// only for optimistic display.

const THRESHOLDS = [0, 30, 75, 135, 210];
const POST_L5_STEP = 120;

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= THRESHOLDS.length) return THRESHOLDS[level - 1]!;
  return THRESHOLDS[THRESHOLDS.length - 1]! + (level - THRESHOLDS.length) * POST_L5_STEP;
}

export function levelForXp(totalXp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp) level += 1;
  return level;
}
