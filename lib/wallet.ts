// Real browser wallet connection (injected EIP-1193 provider, e.g. MetaMask / Base
// Wallet). Replaces the old hardcoded DEV_ADDRESS placeholder. The connected address
// is what receives USDC payouts, so it must be a wallet the user actually controls.
// The server verifies the SIWE signature for real (server/src/services/siwe.ts) when
// the signature is a real 65-byte ECDSA one, so this is a genuine sign-in, not a stub.

import { getAddress } from "viem";
import { createSiweMessage } from "viem/siwe";

type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

function injected(): Eip1193 | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: Eip1193 }).ethereum ?? null;
}

/** True when a browser wallet is available to connect. */
export function hasInjectedWallet(): boolean {
  return injected() !== null;
}

/** Prompt the injected wallet to connect and return the checksummed address. */
export async function connectInjectedWallet(): Promise<string> {
  const eth = injected();
  if (!eth) throw new Error("No wallet found. Install MetaMask or a Base-compatible wallet.");
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.[0]) throw new Error("No account authorized.");
  return getAddress(accounts[0]);
}

/**
 * Build an EIP-4361 SIWE message and sign it with the injected wallet. The domain
 * must match the server's SIWE_DOMAIN (localhost:3000 in dev), so run the frontend
 * on that host. Returns the message + real signature for the backend to verify.
 */
export async function signSiweWithWallet(
  address: string,
  nonce: string,
  chainId = 84532, // Base Sepolia
): Promise<{ message: string; signature: string }> {
  const eth = injected();
  if (!eth) throw new Error("No wallet found.");
  const checksummed = getAddress(address);
  const message = createSiweMessage({
    address: checksummed,
    chainId,
    domain: window.location.host,
    nonce,
    uri: window.location.origin,
    version: "1",
    statement: "Attach this wallet to your Nautica account to receive USDC payouts.",
  });
  const signature = (await eth.request({ method: "personal_sign", params: [message, checksummed] })) as string;
  return { message, signature };
}
