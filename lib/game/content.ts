import type { LucideIcon } from "lucide-react";
import {
  Bug,
  createLucideIcon,
  Droplets,
  Eye,
  Fish,
  FishSymbol,
  IdCard,
  ScanFace,
  Star,
  Turtle,
  Umbrella,
  Wheat,
  Zap,
} from "lucide-react";
import type { Quest, SpeciesId, VerifyStep } from "./types";

// Lucide has no jellyfish glyph, so we build one (filled bell + 3 tentacles).
// Rendered filled (callers pass fill="currentColor"), matching the icon style.
const Jellyfish = createLucideIcon("Jellyfish", [
  ["path", { d: "M5 11a7 5.5 0 0 1 14 0q-3.5 2-7 0-3.5 2-7 0Z", key: "bell" }],
  ["path", { d: "M8 12.5c0 2.5-1 3-1 5.5", fill: "none", key: "t1" }],
  ["path", { d: "M12 13v5", fill: "none", key: "t2" }],
  ["path", { d: "M16 12.5c0 2.5 1 3 1 5.5", fill: "none", key: "t3" }],
]);

// ---- Species presentation (labels, marker color token, icon) ----------------
/** Coarse "should I care?" class. Drives the MAP marker color (glanceable);
 * species identity is carried by the pin icon + tooltip instead. */
export type RiskClass = "hazard" | "invasive" | "normal";

export type SpeciesMeta = {
  label: string;
  short: string;
  color: string; // per-species identity accent — used in the labeled panels
  icon: LucideIcon;
  hazard?: boolean; // drives the gallery hazard badge; equals `risk !== "normal"`
  risk: RiskClass; // drives the map marker color
  plant?: boolean; // teal class only: plant → seagrass icon on the map, else fish
};

// On the map, COLOR means risk, not species — a glanceable read kept to 3 classes
// so the legend stays tiny and colors never collide (the 9-species palette did).
// These reuse the brand's status tokens on purpose: red = danger, amber = caution,
// teal = the calm baseline. Never shown color-alone — always with icon + label.
export const RISK_META: Record<RiskClass, { label: string; color: string }> = {
  hazard: { label: "Hazard", color: "var(--destructive)" },
  invasive: { label: "Invasive", color: "var(--warning)" },
  normal: { label: "Marine life", color: "var(--primary)" },
};

export const SPECIES_META: Record<SpeciesId, SpeciesMeta> = {
  Physalia: { label: "Physalia (Portuguese man-o-war)", short: "Physalia", color: "var(--destructive)", icon: Zap, hazard: true, risk: "hazard" },
  Jellyfish: { label: "Jellyfish", short: "Jellyfish", color: "var(--warning)", icon: Umbrella, hazard: true, risk: "hazard" },
  Crab: { label: "Crab", short: "Crab", color: "var(--chart-4)", icon: Bug, risk: "normal" },
  ShoreFish: { label: "Shore fish", short: "Fish", color: "var(--primary)", icon: Fish, risk: "normal" },
  ShorePlant: { label: "Shore plant", short: "Plant", color: "var(--success)", icon: Wheat, risk: "normal", plant: true },
  SeaStar: { label: "Sea star", short: "Sea star", color: "var(--chart-5)", icon: Star, risk: "normal" },
  Lionfish: { label: "Lionfish (invasive)", short: "Lionfish", color: "var(--destructive)", icon: FishSymbol, hazard: true, risk: "invasive" },
  Turtle: { label: "Sea turtle", short: "Turtle", color: "var(--chart-3)", icon: Turtle, risk: "normal" },
  Other: { label: "Other", short: "Other", color: "var(--muted-foreground)", icon: Droplets, risk: "normal" },
};

// The MAP uses a REDUCED icon set — 4 total — chosen from risk (+ plant-vs-animal
// for the teal class): hazard → jellyfish, invasive/animal → fish silhouette,
// plant → seagrass. Only jellies are dangerous, so red is uniformly the jellyfish
// symbol (Physalia included). The detailed per-species `icon` above stays for the
// labeled panels/sidebar, where a crab should still look like a crab.
export function mapIcon(species: SpeciesId): LucideIcon {
  const m = SPECIES_META[species];
  if (m.risk === "hazard") return Jellyfish;
  if (m.risk === "invasive") return FishSymbol;
  return m.plant ? Wheat : FishSymbol;
}

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
