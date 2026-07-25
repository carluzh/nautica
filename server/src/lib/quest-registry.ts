import { DAILY_QUESTS } from "../content";
import type { Quest } from "../types";

// Server-side quest registry: the source of truth for which quests exist and the
// full off-chain metadata the escrow contract can't carry (spec, requirements,
// partner). Seeded from DAILY_QUESTS at load so the board is non-empty at demo
// start (and beat 1 — completing a seeded quest — still works). Partner-created
// quests are appended here after their on-chain escrow lands. In-memory: a restart
// re-seeds and forgets partner quests, which is fine for the demo.

export type RegisteredQuest = Quest & { createdAt: number };

export interface QuestRegistry {
  get(id: string): RegisteredQuest | undefined;
  all(): RegisteredQuest[]; // insertion order; seed first
  has(id: string): boolean;
  add(q: RegisteredQuest): RegisteredQuest; // throws if id present
}

class InMemoryQuestRegistry implements QuestRegistry {
  private quests = new Map<string, RegisteredQuest>();
  constructor(seed: Quest[]) {
    const t = Date.now();
    for (const q of seed) this.quests.set(q.id, { ...q, createdAt: t });
  }
  get(id: string) {
    return this.quests.get(id);
  }
  all() {
    return [...this.quests.values()];
  }
  has(id: string) {
    return this.quests.has(id);
  }
  add(q: RegisteredQuest) {
    if (this.quests.has(q.id)) throw new Error(`quest ${q.id} already exists`);
    this.quests.set(q.id, q);
    return q;
  }
}

export const questRegistry: QuestRegistry = new InMemoryQuestRegistry(DAILY_QUESTS);
