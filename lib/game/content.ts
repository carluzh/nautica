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
/** The 4 map filter categories. Drives the MAP marker color (glanceable) and the
 * left-column filter toggles; species identity is carried by the pin icon + tooltip. */
export type Category = "marine" | "invasive" | "hazard" | "rare";

export type SpeciesMeta = {
  label: string;
  short: string;
  color: string; // per-species identity accent — used in the labeled panels
  icon: LucideIcon;
  hazard?: boolean; // drives the gallery hazard badge (things to be cautious of)
  category: Category; // drives the map marker color + the filter toggles
  plant?: boolean; // marine plant → seagrass icon on the map, else fish
};

// On the map, COLOR means category, not species — a glanceable read kept to 4
// classes so the legend stays tiny and colors never collide. Teal is kept here for
// "Marine life" (the ocean read) even though the brand accent is now coral; red =
// hazard, amber = invasive, violet = rare. Never shown color-alone — always with
// icon + label. Ordered as shown in the filter/legend.
export const CATEGORY_META: Record<Category, { label: string; color: string; icon: LucideIcon }> = {
  marine: { label: "Marine life", color: "oklch(0.702 0.132 194)", icon: Fish },
  invasive: { label: "Invasive species", color: "var(--warning)", icon: FishSymbol },
  hazard: { label: "Hazards", color: "var(--destructive)", icon: Zap },
  rare: { label: "Rare findings", color: "var(--chart-5)", icon: Star },
};

/** Filter/legend display order (matches the product spec order). */
export const CATEGORY_ORDER: Category[] = ["marine", "invasive", "hazard", "rare"];

export const SPECIES_META: Record<SpeciesId, SpeciesMeta> = {
  Physalia: { label: "Physalia (Portuguese man-o-war)", short: "Physalia", color: "var(--destructive)", icon: Zap, hazard: true, category: "hazard" },
  Jellyfish: { label: "Jellyfish", short: "Jellyfish", color: "var(--warning)", icon: Umbrella, hazard: true, category: "hazard" },
  Crab: { label: "Crab", short: "Crab", color: "var(--chart-4)", icon: Bug, category: "marine" },
  ShoreFish: { label: "Shore fish", short: "Fish", color: "var(--primary)", icon: Fish, category: "marine" },
  ShorePlant: { label: "Shore plant", short: "Plant", color: "var(--success)", icon: Wheat, category: "marine", plant: true },
  SeaStar: { label: "Sea star", short: "Sea star", color: "var(--chart-5)", icon: Star, category: "rare" },
  Lionfish: { label: "Lionfish (invasive)", short: "Lionfish", color: "var(--destructive)", icon: FishSymbol, hazard: true, category: "invasive" },
  Turtle: { label: "Sea turtle", short: "Turtle", color: "var(--chart-3)", icon: Turtle, category: "rare" },
  Other: { label: "Other", short: "Other", color: "var(--muted-foreground)", icon: Droplets, category: "marine" },
};

/** The map category a species belongs to (feeds marker color + filter toggles). */
export function speciesCategory(species: SpeciesId): Category {
  return SPECIES_META[species].category;
}

/** Species grouped for the by-name filter checklist (second filter dimension). */
export const SPECIES_GROUPS: { label: string; species: SpeciesId[] }[] = [
  { label: "Fish", species: ["ShoreFish", "Lionfish"] },
  { label: "Jellies", species: ["Jellyfish", "Physalia"] },
  { label: "Crust & Stars", species: ["Crab", "SeaStar"] },
  { label: "Others", species: ["Turtle", "ShorePlant", "Other"] },
];

// The MAP uses a REDUCED icon set chosen from the category (+ plant-vs-animal for
// marine life): hazard → jellyfish, invasive → fish silhouette, rare → star, marine
// plant → seagrass, marine animal → fish. The detailed per-species `icon` above
// stays for the labeled panels/sidebar, where a crab should still look like a crab.
export function mapIcon(species: SpeciesId): LucideIcon {
  const m = SPECIES_META[species];
  if (m.category === "hazard") return Jellyfish;
  if (m.plant) return Wheat;
  return CATEGORY_META[m.category].icon;
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
