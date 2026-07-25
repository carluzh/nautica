import type { ActivityEvent, GalleryItem, Payment, Verification } from "../types";

// In-memory store behind a small interface. It is the data layer WHILE the
// subgraph/chain are stubbed; once those are live, reads move to the subgraph
// broker and this shrinks to just sessions/nullifiers/nonces. Swap the impl for
// Redis/Postgres by implementing `Store`.

export type UserRecord = {
  userId: string;
  handle: string;
  wallet: string | null;
  xp: number;
  streak: number;
  verification: Verification;
  balanceUsd: number;
  createdAt: number;
  gallery: GalleryItem[];
  activity: ActivityEvent[];
  payments: Payment[];
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
  userIdByNullifier(nullifier: string): string | undefined;
  linkNullifier(nullifier: string, userId: string): void;
  allUsers(): UserRecord[];
  putNonce(nonce: string, rec: NonceRecord): void;
  getNonce(nonce: string): NonceRecord | undefined;
  consumeNonce(nonce: string): void;
}

class InMemoryStore implements Store {
  private users = new Map<string, UserRecord>();
  private nullifiers = new Map<string, string>();
  private nonces = new Map<string, NonceRecord>();

  getUser(userId: string) {
    return this.users.get(userId);
  }
  createUser(u: UserRecord) {
    this.users.set(u.userId, u);
    return u;
  }
  updateUser(userId: string, patch: Partial<UserRecord>) {
    const u = this.users.get(userId);
    if (!u) return undefined;
    const next = { ...u, ...patch };
    this.users.set(userId, next);
    return next;
  }
  userIdByNullifier(nullifier: string) {
    return this.nullifiers.get(nullifier);
  }
  linkNullifier(nullifier: string, userId: string) {
    this.nullifiers.set(nullifier, userId);
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

export const store: Store = new InMemoryStore();
