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

// Lucide has no jellyfish glyph, so we build one; rendered filled to match the icon style.
const Jellyfish = createLucideIcon("Jellyfish", [
  ["path", { d: "M5 11a7 5.5 0 0 1 14 0q-3.5 2-7 0-3.5 2-7 0Z", key: "bell" }],
  ["path", { d: "M8 12.5c0 2.5-1 3-1 5.5", fill: "none", key: "t1" }],
  ["path", { d: "M12 13v5", fill: "none", key: "t2" }],
  ["path", { d: "M16 12.5c0 2.5 1 3 1 5.5", fill: "none", key: "t3" }],
]);

/** The 4 map filter categories; drives the marker color and the filter toggles. */
export type Category = "marine" | "invasive" | "hazard" | "rare";

export type SpeciesMeta = {
  label: string;
  short: string;
  color: string; // per-species identity accent - used in the labeled panels
  icon: LucideIcon;
  hazard?: boolean; // drives the gallery hazard badge (things to be cautious of)
  category: Category; // drives the map marker color + the filter toggles
  plant?: boolean; // marine plant → seagrass icon on the map, else fish
};

// On the map, color encodes category (not species), kept to 4 classes so colors never
// collide: teal = marine, amber = invasive, red = hazard, violet = rare. Always shown
// with icon + label, never color alone. Ordered as in the filter/legend.
export const CATEGORY_META: Record<Category, { label: string; color: string; icon: LucideIcon }> = {
  marine: { label: "Marine life", color: "oklch(0.702 0.132 194)", icon: Fish },
  invasive: { label: "Invasive species", color: "var(--warning)", icon: FishSymbol },
  hazard: { label: "Hazards", color: "var(--destructive)", icon: Zap },
  rare: { label: "Rare findings", color: "var(--chart-5)", icon: Star },
};

/** Filter/legend display order. */
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

// The map uses a reduced icon set chosen by category (plus plant-vs-animal for marine):
// hazard -> jellyfish, invasive -> fish silhouette, rare -> star, marine plant -> seagrass,
// marine animal -> fish. The detailed per-species `icon` is used only in the labeled panels.
export function mapIcon(species: SpeciesId): LucideIcon {
  const m = SPECIES_META[species];
  if (m.category === "hazard") return Jellyfish;
  if (m.plant) return Wheat;
  return CATEGORY_META[m.category].icon;
}

// World ID verification ladder, separate from the XP level.
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

// Research partners that fund paid quests.
export const PARTNERS = [
  "MARE · Marine Sciences Institute",
  "Oceanário de Lisboa",
  "IPMA Coastal Program",
] as const;

// Daily quests: 3 free + 1 paid.
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
    id: "q-paid-seastar",
    kind: "paid",
    title: "Sea star survey (paid)",
    spec: "One clear, well-lit photo of a sea star.",
    species: "SeaStar",
    reward: 40,
    status: "available",
    usdc: 1,
    partner: PARTNERS[0],
    requirements: ["One clear photo of a sea star"],
  },
];
