import { createHash } from "node:crypto";
import type { UserRecord } from "./store";
import type { Verification } from "../types";

/** Deterministic user id from a namespaced external identity. */
export function userIdFor(externalKey: string): string {
  return "u_" + createHash("sha256").update(externalKey).digest("hex").slice(0, 16);
}

/** A fresh user record with sane defaults. */
export function newUser(opts: {
  userId: string;
  handle: string;
  wallet?: string | null;
  verification?: Partial<Verification>;
  xp?: number;
}): UserRecord {
  const now = Date.now();
  return {
    userId: opts.userId,
    handle: opts.handle,
    wallet: opts.wallet ?? null,
    xp: opts.xp ?? 0,
    streak: 0,
    verification: { face: false, passport: false, orb: false, ...opts.verification },
    balanceUsd: 0,
    createdAt: now,
    gallery: [],
    activity: [{ id: `a_${now}`, kind: "join", title: "Joined Nautica", at: now }],
    payments: [],
  };
}
