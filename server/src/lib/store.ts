import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ActivityEvent, GalleryItem } from "../types";

// Data layer WHILE the subgraph/chain are stubbed; once those are live, reads move
// to the subgraph broker and this shrinks to just sessions/nonces.
//
// Disk-backed so a server restart does NOT wipe leveling: users are persisted to a
// JSON file and reloaded on boot. Guests are fresh uuids; email accounts are keyed
// by `email:<lowercased>` (look up with getUser). Sessions are stateless JWTs
// (survive restarts already) and nonces are ephemeral freshness challenges (fine to
// lose), so neither is persisted. Swap the impl for Redis/Postgres via `Store`.

export type UserRecord = {
  userId: string;
  handle: string;
  wallet: string; // deterministic derived on-chain address, always set
  xp: number;
  streak: number;
  passwordHash?: string; // email accounts only (scrypt$salt$hash)
  createdAt: number;
  gallery: GalleryItem[];
  activity: ActivityEvent[];
};

export type NonceRecord = {
  userId: string;
  questId: string;
  expiresAt: number;
  used: boolean;
};

export interface Store {
  getUser(userId: string): UserRecord | undefined;
  createUser(u: UserRecord): UserRecord;
  updateUser(userId: string, patch: Partial<UserRecord>): UserRecord | undefined;
  allUsers(): UserRecord[];
  putNonce(nonce: string, rec: NonceRecord): void;
  getNonce(nonce: string): NonceRecord | undefined;
  consumeNonce(nonce: string): void;
}

const STORE_FILE = process.env.STORE_FILE ?? "./.data/store.json";

class PersistentStore implements Store {
  private users = new Map<string, UserRecord>();
  private nonces = new Map<string, NonceRecord>();

  constructor() {
    try {
      const d = JSON.parse(readFileSync(STORE_FILE, "utf8")) as {
        users?: [string, UserRecord][];
      };
      if (d.users) this.users = new Map(d.users);
    } catch {
      /* no store file yet — start empty */
    }
  }

  /** Best-effort synchronous persist of the durable maps (low write volume). */
  private save() {
    try {
      mkdirSync(dirname(STORE_FILE), { recursive: true });
      writeFileSync(STORE_FILE, JSON.stringify({ users: [...this.users] }));
    } catch {
      /* disk write failed — keep serving from memory */
    }
  }

  getUser(userId: string) {
    return this.users.get(userId);
  }
  createUser(u: UserRecord) {
    this.users.set(u.userId, u);
    this.save();
    return u;
  }
  updateUser(userId: string, patch: Partial<UserRecord>) {
    const u = this.users.get(userId);
    if (!u) return undefined;
    const next = { ...u, ...patch };
    this.users.set(userId, next);
    this.save();
    return next;
  }
  allUsers() {
    return [...this.users.values()];
  }
  putNonce(nonce: string, rec: NonceRecord) {
    this.nonces.set(nonce, rec);
  }
  getNonce(nonce: string) {
    return this.nonces.get(nonce);
  }
  consumeNonce(nonce: string) {
    const rec = this.nonces.get(nonce);
    if (rec) this.nonces.set(nonce, { ...rec, used: true });
  }
}

export const store: Store = new PersistentStore();
