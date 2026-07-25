// AssemblyScript port of server/src/lib/levels.ts - used only to detect level-up
// crossings for the Activity feed. The broker computes the displayed level from xp.

const THRESHOLDS: i32[] = [0, 30, 75, 135, 210];
const POST_L5_STEP: i32 = 120;

export function xpForLevel(level: i32): i32 {
  if (level <= 1) return 0;
  if (level <= THRESHOLDS.length) return THRESHOLDS[level - 1];
  return THRESHOLDS[THRESHOLDS.length - 1] + (level - THRESHOLDS.length) * POST_L5_STEP;
}

export function levelForXp(totalXp: i32): i32 {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp) level += 1;
  return level;
}
