import type { LucideIcon } from "lucide-react";
import {
  Bug,
  Droplets,
  Eye,
  Fish,
  FishSymbol,
  Flower2,
  IdCard,
  ScanFace,
  Sparkles,
  Star,
  Turtle,
  Zap,
} from "lucide-react";
import type { Quest, SpeciesId, VerifyStep } from "./types";

// ---- Species presentation (labels, marker color token, icon) ----------------
export type SpeciesMeta = {
  label: string;
  short: string;
  color: string; // token CSS var, resolves in marker DOM
  icon: LucideIcon;
  hazard?: boolean;
};

export const SPECIES_META: Record<SpeciesId, SpeciesMeta> = {
  Physalia: { label: "Physalia (Portuguese man-o-war)", short: "Physalia", color: "var(--destructive)", icon: Zap, hazard: true },
  Jellyfish: { label: "Jellyfish", short: "Jellyfish", color: "var(--warning)", icon: Sparkles, hazard: true },
  Crab: { label: "Crab", short: "Crab", color: "var(--chart-4)", icon: Bug },
  ShoreFish: { label: "Shore fish", short: "Fish", color: "var(--primary)", icon: Fish },
  ShorePlant: { label: "Shore plant", short: "Plant", color: "var(--success)", icon: Flower2 },
  SeaStar: { label: "Sea star", short: "Sea star", color: "var(--chart-5)", icon: Star },
  Lionfish: { label: "Lionfish (invasive)", short: "Lionfish", color: "var(--destructive)", icon: FishSymbol, hazard: true },
  Turtle: { label: "Sea turtle", short: "Turtle", color: "var(--chart-3)", icon: Turtle },
  Other: { label: "Other", short: "Other", color: "var(--muted-foreground)", icon: Droplets },
};

// ---- World ID verification ladder (SEPARATE from XP level) -------------------
export type TierDef = {
  step: VerifyStep;
  name: string;
  method: string;
  icon: LucideIcon;
  unlocks: string;
  detail: string;
  color: string;
};

export const TIERS: TierDef[] = [
  {
    step: "face",
    name: "Face",
    method: "Selfie Check",
    icon: ScanFace,
    unlocks: "Play, earn XP, log verified sightings",
    detail: "Confirms a live, unique human on-device. Fast and free.",
    color: "var(--primary)",
  },
  {
    step: "passport",
    name: "Passport",
    method: "Identity / Document Check",
    icon: IdCard,
    unlocks: "Eligible for paid research quests",
    detail: "Document-backed uniqueness before any money moves.",
    color: "var(--chart-2)",
  },
  {
    step: "orb",
    name: "Orb",
    method: "World ID Orb · iris",
    icon: Eye,
    unlocks: "Payouts above the daily threshold",
    detail: "Strongest proof of unique personhood.",
    color: "var(--warning)",
  },
];

// ---- Research partners (fund paid quests) -----------------------------------
export const PARTNERS = [
  "MARE · Marine Sciences Institute",
  "Oceanário de Lisboa",
  "IPMA Coastal Program",
] as const;

// ---- Daily quests (3 free + 1 paid gated at Level 5) ------------------------
export const DAILY_QUESTS: Quest[] = [
  {
    id: "q-crab",
    kind: "free",
    title: "Photograph a crab",
    spec: "One clear photo of a crab, whole body visible.",
    species: "Crab",
    reward: 5,
    status: "available",
  },
  {
    id: "q-plant",
    kind: "free",
    title: "Photograph a shore plant",
    spec: "A coastal or intertidal plant, in focus, filling most of the frame.",
    species: "ShorePlant",
    reward: 10,
    status: "available",
  },
  {
    id: "q-jelly",
    kind: "free",
    title: "Log a jellyfish sighting",
    spec: "Any jellyfish or Physalia, close enough to identify the bell.",
    species: "Jellyfish",
    reward: 25,
    status: "available",
  },
  {
    id: "q-paid-lionfish",
    kind: "paid",
    title: "Lionfish survey (paid)",
    spec: "Invasive lionfish for a removal study. Match the partner spec below.",
    species: "Lionfish",
    reward: 40,
    status: "available",
    usdc: 6,
    partner: PARTNERS[0],
    requirements: ["Dorsal view", "Ventral view", "Size reference in frame"],
  },
];
