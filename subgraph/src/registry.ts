import { Bytes } from "@graphprotocol/graph-ts";

// The mapping's copy of server/src/content.ts. The event carries only a bytes32
// questId; species/title (and a usdc fallback) are resolved here. Keep in lockstep.
//
// chain.ts encodes the id as utf8(questId) right-padded with 0x00 to 32 bytes, so
// decodeQuestId reverses it: read ASCII bytes until the first null.

export class QuestMeta {
  questId: string;
  species: string;
  title: string;
  constructor(questId: string, species: string, title: string) {
    this.questId = questId;
    this.species = species;
    this.title = title;
  }
}

/** bytes32 (utf8 + null padding) -> app quest id string. */
export function decodeQuestId(raw: Bytes): string {
  let s = "";
  for (let i = 0; i < raw.length; i++) {
    const b = raw[i];
    if (b == 0) break;
    s += String.fromCharCode(b as i32);
  }
  return s;
}

/** Resolve the display metadata for a decoded quest id (mirrors content.ts). */
export function questMeta(questId: string): QuestMeta {
  if (questId == "q-crab") return new QuestMeta(questId, "Crab", "Photograph a crab");
  if (questId == "q-plant") return new QuestMeta(questId, "ShorePlant", "Photograph a shore plant");
  if (questId == "q-jelly") return new QuestMeta(questId, "Jellyfish", "Log a jellyfish sighting");
  if (questId == "q-paid-lionfish") return new QuestMeta(questId, "Lionfish", "Lionfish survey (paid)");
  // Unknown / future quest: safe default so indexing never fails.
  return new QuestMeta(questId, "Other", "Sighting");
}
