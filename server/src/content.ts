import type { Quest } from "./types";

// The server owns quest definitions (reward, spec) so the client can never inflate
// its own XP. Later these come from a quest registry; for now they are
// static and mirror the frontend board. All quests are free and XP-only.

export const DAILY_QUESTS: Quest[] = [
  { id: "q-crab", title: "Photograph a crab", spec: "One clear photo of a crab, whole body visible.", species: "Crab", reward: 5 },
  { id: "q-plant", title: "Photograph a shore plant", spec: "A coastal or intertidal plant, in focus, filling most of the frame.", species: "ShorePlant", reward: 10 },
  { id: "q-jelly", title: "Log a jellyfish sighting", spec: "Any jellyfish or Physalia, close enough to identify the bell.", species: "Jellyfish", reward: 25 },
];
