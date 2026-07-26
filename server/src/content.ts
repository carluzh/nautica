import type { Quest } from "./types";

// The server owns quest definitions (reward, spec) so the client can never inflate
// its own XP. Later these come from a quest registry; for now they are
// static and mirror the frontend board. All quests are free and XP-only.

export const DAILY_QUESTS: Quest[] = [
  { id: "q-selfie-sea", title: "Sea selfie", spec: "Snap a selfie or portrait of someone outdoors with the open sea, waves, or a sandy beach clearly behind them.", species: "Other", reward: 5 },
  { id: "q-color-stone", title: "Colorful stone", spec: "Find a colorful beach pebble and photograph it up close, held in your hand or on the sand, with its color clearly visible.", species: "Other", reward: 5 },
  { id: "q-crab", title: "Crab paparazzi", spec: "Catch a live crab on camera, its whole body visible in one clear shot.", species: "Crab", reward: 10 },
  { id: "q-color-fish", title: "Rainbow fish", spec: "Photograph a brightly colored fish (orange, red, yellow, or blue), its body and fins clearly visible.", species: "ShoreFish", reward: 15 },
  { id: "q-star", title: "Starfish trophy", spec: "Track down a live starfish and photograph it with its arms visible, in a tide pool, on wet rock, or held in your hand.", species: "SeaStar", reward: 25 },
  { id: "q-duo", title: "Two's company", spec: "Get two different sea or shore animals together in one photo, for example a crab and a fish, or two different creatures.", species: "Other", reward: 25 },
];
