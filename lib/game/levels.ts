import type { LevelInfo } from "./types";

// Cumulative XP thresholds. Tuned so Level 5 (the paid-quest unlock) takes about
// a week of casual play. After L5 the curve keeps climbing at +120/level.
export const THRESHOLDS = [0, 30, 75, 135, 210];
const POST_L5_STEP = 120;

/** Cumulative XP required to have reached a given level (1-indexed). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= THRESHOLDS.length) return THRESHOLDS[level - 1];
  return THRESHOLDS[THRESHOLDS.length - 1] + (level - THRESHOLDS.length) * POST_L5_STEP;
}

export const LEVEL_UNLOCKS: Record<number, string> = {
  1: "Daily photo quests",
  2: "Field gallery",
  3: "Community leaderboard",
  5: "Paid research quests + payouts",
};

export const PAID_UNLOCK_LEVEL = 5;

export function nextUnlockFrom(level: number): string | null {
  const future = Object.keys(LEVEL_UNLOCKS)
    .map(Number)
    .filter((l) => l > level)
    .sort((a, b) => a - b);
  if (future.length === 0) return null;
  const l = future[0];
  return `L${l} · ${LEVEL_UNLOCKS[l]}`;
}

export function levelInfo(totalXp: number): LevelInfo {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp) level += 1;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const xpInto = totalXp - base;
  const xpSpan = next - base;
  return {
    level,
    xpInto,
    xpSpan,
    xpToNext: Math.max(0, next - totalXp),
    progress: xpSpan > 0 ? Math.min(1, xpInto / xpSpan) : 1,
    totalXp,
    nextUnlock: nextUnlockFrom(level),
  };
}
