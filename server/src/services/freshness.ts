import { randomBytes } from "node:crypto";
import { store } from "../lib/store";

// Anti-fraud freshness challenge. The client must request a nonce right before
// capturing, then submit it with the photo. A submission is only accepted if the
// nonce is unused and unexpired — a photo therefore must postdate the quest,
// which kills stock images and pre-generated fakes. Single-use.

const TTL_MS = 1000 * 60 * 10; // 10 minutes to shoot + submit

export function issueChallenge(userId: string, questId: string): { nonce: string; expiresAt: number } {
  const nonce = randomBytes(16).toString("hex");
  const expiresAt = Date.now() + TTL_MS;
  store.putNonce(nonce, { userId, questId, expiresAt, used: false });
  return { nonce, expiresAt };
}

export function validateChallenge(input: {
  nonce: string;
  userId: string;
  questId: string;
}): { ok: true } | { ok: false; reason: string } {
  const rec = store.getNonce(input.nonce);
  if (!rec) return { ok: false, reason: "No freshness challenge — request one before shooting." };
  if (rec.used) return { ok: false, reason: "Challenge already used." };
  if (rec.userId !== input.userId || rec.questId !== input.questId)
    return { ok: false, reason: "Challenge does not match this quest." };
  if (Date.now() > rec.expiresAt) return { ok: false, reason: "Challenge expired — grab a fresh one." };
  store.consumeNonce(input.nonce);
  return { ok: true };
}
