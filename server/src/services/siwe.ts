import { getAddress, recoverMessageAddress, type Hex } from "viem";
import { generateSiweNonce, parseSiweMessage } from "viem/siwe";
import { config } from "../config";
import { log } from "../lib/logger";

const DEV_ADDRESS = "0x000000000000000000000000000000000000dEaD";
const ADDR_RE = /0x[0-9a-fA-F]{40}/;
const REAL_SIG_RE = /^0x[0-9a-fA-F]{130}$/; // a real 65-byte ECDSA signature

// Sign-In With Ethereum (EIP-4361) verification for wallet login + wallet attach.
// Uses viem's native SIWE utilities (no extra dependency). EOA signatures only
// (EIP-1271 smart-wallet support would need a public client - future).

const NONCE_TTL_MS = 1000 * 60 * 10;
const nonces = new Map<string, number>(); // nonce -> expiresAt

/** Issue a single-use SIWE nonce for the client to embed in its message. */
export function issueNonce(): { nonce: string } {
  const nonce = generateSiweNonce();
  nonces.set(nonce, Date.now() + NONCE_TTL_MS);
  return { nonce };
}

export type SiweOk = { ok: true; address: string };
export type SiweErr = { ok: false; reason: string };

/** Verify a SIWE message + signature. Returns the checksummed signer address. */
export async function verifySiwe(message: string, signature: string): Promise<SiweOk | SiweErr> {
  // Dev bypass (parity with World ID/Google dev-mock): when enabled, any
  // non-real signature is accepted. The wallet address is taken from the message,
  // else the signature, else a default. Real signatures always take the real path.
  if (config.siweDevBypass && !REAL_SIG_RE.test(signature)) {
    const found = message.match(ADDR_RE)?.[0] ?? signature.match(ADDR_RE)?.[0] ?? DEV_ADDRESS;
    for (const n of nonces.keys()) {
      if (message.includes(n)) {
        nonces.delete(n); // consume the nonce if one is present, for flow realism
        break;
      }
    }
    let address: string;
    try {
      address = getAddress(found.toLowerCase());
    } catch {
      address = getAddress(DEV_ADDRESS);
    }
    log.warn("siwe: DEV bypass accepted a placeholder signature", { address });
    return { ok: true, address };
  }

  let parsed;
  try {
    parsed = parseSiweMessage(message);
  } catch {
    return { ok: false, reason: "malformed SIWE message" };
  }
  if (!parsed.address || !parsed.nonce) return { ok: false, reason: "SIWE message missing address/nonce" };

  const exp = nonces.get(parsed.nonce);
  if (!exp) return { ok: false, reason: "unknown nonce - request a fresh one" };
  if (Date.now() > exp) {
    nonces.delete(parsed.nonce);
    return { ok: false, reason: "nonce expired" };
  }
  if (parsed.domain && parsed.domain !== config.SIWE_DOMAIN) {
    return { ok: false, reason: "SIWE domain mismatch" };
  }
  if (parsed.expirationTime && new Date(parsed.expirationTime).getTime() < Date.now()) {
    return { ok: false, reason: "SIWE message expired" };
  }

  let recovered: string;
  try {
    recovered = await recoverMessageAddress({ message, signature: signature as Hex });
  } catch (err) {
    log.warn("siwe: recover failed", { err: String(err) });
    return { ok: false, reason: "invalid signature" };
  }
  if (recovered.toLowerCase() !== parsed.address.toLowerCase()) {
    return { ok: false, reason: "signature does not match address" };
  }

  nonces.delete(parsed.nonce); // single-use
  return { ok: true, address: recovered };
}
