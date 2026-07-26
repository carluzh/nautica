import type { LeaderboardEntry, UserState } from "./types";

export const INITIAL_USER: UserState = {
  connected: false,
  handle: "",
  wallet: null,
  xp: 0,
  streak: 0,
};

export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, handle: "tide.eth", xp: 640, level: 6 },
  { rank: 2, handle: "reefwarden", xp: 512, level: 6 },
  { rank: 3, handle: "marisol", xp: 430, level: 5 },
  { rank: 4, handle: "coastwatch", xp: 300, level: 5 },
  { rank: 5, handle: "lena.nautica.eth", xp: 90, level: 3, you: true },
  { rank: 6, handle: "gaivota", xp: 75, level: 3 },
  { rank: 7, handle: "salt", xp: 40, level: 2 },
  { rank: 8, handle: "kelp.eth", xp: 34, level: 2 },
  { rank: 9, handle: "nerio", xp: 28, level: 2 },
  { rank: 10, handle: "dorsal", xp: 22, level: 2 },
  { rank: 11, handle: "finn.eth", xp: 15, level: 1 },
  { rank: 12, handle: "brackish", xp: 10, level: 1 },
  { rank: 13, handle: "lowtide", xp: 6, level: 1 },
  { rank: 14, handle: "spume", xp: 3, level: 1 },
];
