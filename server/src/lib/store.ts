import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
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
const BACKUP_FILE = `${STORE_FILE}.bak`;

class PersistentStore implements Store {
  private users = new Map<string, UserRecord>();
  private nonces = new Map<string, NonceRecord>();

  constructor() {
    if (this.load(STORE_FILE)) {
      // The file just proved readable; snapshot it so there is always a
      // one-generation backup to fall back to on the next boot.
      try {
        copyFileSync(STORE_FILE, BACKUP_FILE);
      } catch {
        /* backup is best-effort */
      }
      return;
    }
    const hadStoreFile = existsSync(STORE_FILE);
    if (this.load(BACKUP_FILE)) {
      console.warn(
        `store: ${STORE_FILE} ${hadStoreFile ? "unreadable" : "missing"}, recovered from ${BACKUP_FILE}`,
      );
      return;
    }
    if (hadStoreFile) {
      console.error(`store: failed to parse ${STORE_FILE} and no usable backup, starting empty`);
    }
    /* else: no store file yet - start empty */
  }

  /** Load the durable maps from one store file; false if missing/unparseable. */
  private load(file: string): boolean {
    try {
      const d = JSON.parse(readFileSync(file, "utf8")) as {
        users?: [string, UserRecord][];
      };
      // Require the expected shape: valid-but-wrong JSON (e.g. `{}` after external
      // corruption) must NOT count as a successful load, or the boot snapshot would
      // clobber the only good backup with it.
      if (!Array.isArray(d.users)) return false;
      this.users = new Map(d.users);
      return true;
    } catch {
      return false;
    }
  }

  /** Best-effort synchronous persist of the durable maps (low write volume).
   *  Writes to a temp file then renames over the real one, so a crash mid-write
   *  can never leave a half-written store.json behind. */
  private save() {
    try {
      mkdirSync(dirname(STORE_FILE), { recursive: true });
      const tmp = `${STORE_FILE}.tmp`;
      writeFileSync(tmp, JSON.stringify({ users: [...this.users] }));
      renameSync(tmp, STORE_FILE);
    } catch {
      /* disk write failed - keep serving from memory */
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
