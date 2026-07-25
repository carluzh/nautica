import { config, integrations } from "../config";
import { log } from "../lib/logger";
import type { VerificationLevel, VerifyStep } from "../types";

// World ID proof, as produced by IDKit on the frontend and forwarded here.
export type WorldProof = {
  proof: string;
  merkle_root: string;
  nullifier_hash: string;
  verification_level: VerificationLevel;
};

export type VerifyOk = { ok: true; nullifier: string; level: VerificationLevel; simulated: boolean };
export type VerifyErr = { ok: false; reason: string };

/**
 * Verify a World ID proof server-side. This is the step World requires a server
 * for: the frontend cannot self-attest. We call the Developer Portal cloud
 * verify endpoint; the on-chain verifier on Base is the alternative path.
 *
 * When WORLD_APP_ID is unset the server runs in dev-mock mode: it accepts the
 * proof and trusts the client-supplied nullifier so the whole flow is testable
 * without booth credentials. GET /health reports which mode is active.
 */
export async function verifyWorldProof(input: {
  proof: WorldProof;
  action?: string;
  signal_hash?: string;
}): Promise<VerifyOk | VerifyErr> {
  const action = input.action ?? config.WORLD_ACTION;

  if (!integrations.worldId) {
    log.warn("world id: dev-mock verify (WORLD_APP_ID unset)", { action });
    const nullifier = input.proof.nullifier_hash || `mock_${action}_${input.proof.merkle_root.slice(0, 10)}`;
    return { ok: true, nullifier, level: input.proof.verification_level, simulated: true };
  }

  try {
    const res = await fetch(`${config.WORLD_VERIFY_URL}/${config.WORLD_APP_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nullifier_hash: input.proof.nullifier_hash,
        merkle_root: input.proof.merkle_root,
        proof: input.proof.proof,
        verification_level: input.proof.verification_level,
        action,
        ...(input.signal_hash ? { signal_hash: input.signal_hash } : {}),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      code?: string;
      detail?: string;
    };
    if (!res.ok || !data.success) {
      return { ok: false, reason: data.detail || data.code || `verify failed (${res.status})` };
    }
    return { ok: true, nullifier: input.proof.nullifier_hash, level: input.proof.verification_level, simulated: false };
  } catch (err) {
    log.error("world id: verify request failed", { err: String(err) });
    return { ok: false, reason: "world id verifier unreachable" };
  }
}

/** Map a World credential strength to the Nautica verification tier it grants. */
export function tierFromLevel(level: VerificationLevel): VerifyStep {
  switch (level) {
    case "orb":
      return "orb";
    case "document":
    case "secure_document":
      return "passport";
    case "device":
    default:
      return "face";
  }
}
