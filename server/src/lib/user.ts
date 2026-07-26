import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import type { UserRecord } from "./store";
import { deriveAddress } from "./address";

/** A fresh guest user id (no external identity). */
export function guestUserId(): string {
  return "guest:" + randomUUID();
}

/** Deterministic user id for an email account (case/space-normalized). */
export function emailUserId(email: string): string {
  return "email:" + email.trim().toLowerCase();
}

/** scrypt password hash, stored as `scrypt$<saltHex>$<hashHex>` (no new dep). */
export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pw, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** A fresh user record with sane defaults. `wallet` is the deterministic derived
 *  on-chain address (the leaderboard/index key). */
export function newUser(opts: {
  userId: string;
  handle: string;
  passwordHash?: string;
  xp?: number;
}): UserRecord {
  const now = Date.now();
  return {
    userId: opts.userId,
    handle: opts.handle,
    wallet: deriveAddress(opts.userId),
    xp: opts.xp ?? 0,
    streak: 0,
    passwordHash: opts.passwordHash,
    createdAt: now,
    gallery: [],
    activity: [{ id: `a_${now}`, kind: "join", title: "Joined Nautica", at: now }],
  };
}
