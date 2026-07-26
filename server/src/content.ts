import type { Quest } from "./types";

// The server owns quest definitions (reward, spec, paid gating) so the client
// can never inflate its own XP or payout. Later these come from a partner-quest
// registry; for now they are static and mirror the frontend board.

export const PARTNERS = [
  "MARE · Marine Sciences Institute",
  "Oceanário de Lisboa",
  "IPMA Coastal Program",
] as const;

export const DAILY_QUESTS: Quest[] = [
  { id: "q-crab", kind: "free", title: "Photograph a crab", spec: "One clear photo of a crab, whole body visible.", species: "Crab", reward: 5 },
  { id: "q-plant", kind: "free", title: "Photograph a shore plant", spec: "A coastal or intertidal plant, in focus, filling most of the frame.", species: "ShorePlant", reward: 10 },
  { id: "q-jelly", kind: "free", title: "Log a jellyfish sighting", spec: "Any jellyfish or Physalia, close enough to identify the bell.", species: "Jellyfish", reward: 25 },
  {
    id: "q-paid-seastar",
    kind: "paid",
    title: "Sea star survey",
    spec: "One clear, well-lit photo of a sea star.",
    species: "SeaStar",
    reward: 40,
    usdc: 1,
    partner: PARTNERS[0],
    requirements: ["One clear photo of a sea star"],
  },
];

export function getQuest(id: string): Quest | undefined {
  return DAILY_QUESTS.find((q) => q.id === id);
}
