// XP → level curve. Mirrors the frontend (lib/game/levels.ts). The server is the
// source of truth for XP once the subgraph/chain are live; the frontend curve is
// only for optimistic display.

import type { Verification } from "../types";

const THRESHOLDS = [0, 30, 75, 135, 210];
const POST_L5_STEP = 120;
export const PAID_UNLOCK_LEVEL = 5;

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

// XP floor a verification grants: face→L3, passport→L4, orb→L5. Highest tier wins
// (orb implies the lower tiers), so a user is never demoted and orb-only still floors.
export function xpFloorForVerification(v: Verification): number {
  if (v.orb) return xpForLevel(5); // 210
  if (v.passport) return xpForLevel(4); // 135
  if (v.face) return xpForLevel(3); // 75
  return 0;
}
