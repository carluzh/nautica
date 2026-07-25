import { signRequest } from "@worldcoin/idkit-core/signing";
import { config, integrations } from "../config";
import { log } from "../lib/logger";
import type { VerifyStep } from "../types";

// World ID 4.0 verification (Selfie Check + Identity Check). buildRpContext signs
// a short-lived RP context (signing key stays server-side); verifyWorldProof
// forwards the proof to the v4 cloud verifier. With app_id/rp_id/signing key
// unset the server runs dev-mock (GET /health reports mode).

export type RpContext = {
  rp_id: string;
  nonce: string;
  created_at: number;
  expires_at: number;
  signature: string;
};

type CredentialResult = { identifier: string; nullifier: string };

export type VerifyOk = {
  ok: true;
  nullifier: string; // primary; one per human, used for one-account binding
  nullifiers: string[];
  identifiers: string[]; // raw, e.g. ["selfie"] / ["face"] / ["passport"]
  identityAttested: boolean;
  simulated: boolean;
};
export type VerifyErr = { ok: false; reason: string };

/** Sign a short-lived RP context for a pinned action; the client hands it to IDKit. */
export function buildRpContext(action: string): RpContext {
  if (!integrations.worldId) {
    // Dev-mock: unsigned placeholder; the dev client never opens the real widget.
    return { rp_id: "rp_dev", nonce: `dev_${action}`, created_at: 0, expires_at: 0, signature: "0xdev" };
  }
  const { sig, nonce, createdAt, expiresAt } = signRequest({
    signingKeyHex: config.WORLD_RP_SIGNING_KEY!,
    action,
  });
  return { rp_id: config.WORLD_RP_ID!, nonce, created_at: createdAt, expires_at: expiresAt, signature: sig };
}

/** The raw IDKit response forwarded from the client. */
export type IdkitResponse = {
  protocol_version?: string;
  nonce?: string;
  action?: string;
  environment?: string;
  identity_attested?: boolean;
  responses?: Array<{
    identifier: string;
    nullifier: string;
    issuer_schema_id?: number;
    proof?: string | string[]; // v3 Selfie Check = string, v4 = string[]
    signal_hash?: string;
    expires_at_min?: number;
  }>;
};

// Maps both v4 credential names (selfie/passport/proof_of_human/mnc) and the
// legacy v3 identifiers the verifier reports (face/device/document/…/orb). A real
// Selfie Check proof is v3 and reports "face", so selfie and face both → face.
function tierFromIdentifier(id: string): VerifyStep | null {
  switch (id) {
    case "orb":
    case "proof_of_human":
      return "orb"; // strongest
    case "passport":
    case "document":
    case "secure_document":
    case "mnc":
      return "passport"; // document-strength
    case "selfie":
    case "face":
    case "device":
      return "face"; // Selfie Check / low-assurance biometric one-human
    default:
      return null;
  }
}

/** Verify an IDKit response with the v4 cloud verifier. `expectedAction` is pinned server-side. */
export async function verifyWorldProof(input: {
  idkitResponse: IdkitResponse;
  expectedAction: string;
}): Promise<VerifyOk | VerifyErr> {
  const resp = input.idkitResponse;

  if (!integrations.worldId) {
    log.warn("world id: dev-mock verify (app_id/rp_id/signing key unset)", { action: input.expectedAction });
    const first = resp.responses?.[0];
    const identifier = first?.identifier || "selfie";
    const nullifier = first?.nullifier || `mock_${input.expectedAction}_${identifier}`;
    const identifiers = resp.responses?.map((r) => r.identifier).filter(Boolean) ?? [];
    return {
      ok: true,
      nullifier,
      nullifiers: resp.responses?.map((r) => r.nullifier).filter(Boolean) ?? [nullifier],
      identifiers: identifiers.length ? identifiers : [identifier],
      identityAttested: Boolean(resp.identity_attested),
      simulated: true,
    };
  }

  let data: {
    success?: boolean;
    action?: string;
    nullifier?: string;
    identity_attested?: boolean;
    results?: Array<{ identifier: string; success: boolean; nullifier: string }>;
    code?: string;
    message?: string;
    detail?: string;
  };
  // Pin the RP scope to OUR registered RP. Never trust a client-supplied rp_id:
  // a nullifier is RP-scoped, so verifying under an attacker's RP would mint a
  // fresh nullifier and let one human open unlimited accounts (Sybil).
  const rpId = config.WORLD_RP_ID!;
  try {
    const res = await fetch(`${config.WORLD_VERIFY_URL}/${rpId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Forward the IDKit response unchanged - the verifier expects the full object.
      body: JSON.stringify(resp),
    });
    data = (await res.json().catch(() => ({}))) as typeof data;
    // Surface exactly what the verifier said - invaluable for diagnosing real proofs.
    log.info("world id: v4 verify replied", { rpId, status: res.status, body: data });
    if (!res.ok || !data.success) {
      return { ok: false, reason: data.message || data.detail || data.code || `verify failed (${res.status})` };
    }
  } catch (err) {
    log.error("world id: verify request failed", { err: String(err) });
    return { ok: false, reason: "world id verifier unreachable" };
  }

  // Pin the action: the proof must be for the scope we asked for.
  const provenAction = data.action ?? resp.action;
  if (provenAction && provenAction !== input.expectedAction) {
    log.warn("world id: action mismatch", { expected: input.expectedAction, got: provenAction });
    return { ok: false, reason: "action mismatch" };
  }

  // Prefer the verifier's authoritative results; fall back to the (now-verified) response.
  const results: CredentialResult[] =
    data.results?.filter((r) => r.success).map((r) => ({ identifier: r.identifier, nullifier: r.nullifier })) ??
    resp.responses?.map((r) => ({ identifier: r.identifier, nullifier: r.nullifier })) ??
    [];

  if (!results.length) return { ok: false, reason: "no verified credentials in response" };

  const identifiers = results.map((r) => r.identifier).filter(Boolean);
  const nullifiers = results.map((r) => r.nullifier).filter(Boolean);
  const primary = data.nullifier || nullifiers[0];
  if (!primary) return { ok: false, reason: "no nullifier in verified response" };

  return {
    ok: true,
    nullifier: primary,
    nullifiers: nullifiers.length ? nullifiers : [primary],
    identifiers,
    identityAttested: Boolean(data.identity_attested ?? resp.identity_attested),
    simulated: false,
  };
}

/**
 * Which verification tiers a verified proof grants. Selfie Check → face (one-human
 * leaderboard eligibility); Identity Check's identity_attested → passport
 * (paid-quest unlock); Orb / proof_of_human → orb.
 */
export function tiersFromVerify(v: VerifyOk): VerifyStep[] {
  const tiers = new Set<VerifyStep>();
  for (const id of v.identifiers) {
    const tier = tierFromIdentifier(id);
    if (tier) tiers.add(tier);
  }
  if (v.identityAttested) tiers.add("passport");
  return [...tiers];
}
