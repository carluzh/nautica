import { getAddress, keccak256, toBytes } from "viem";

// Deterministic on-chain "player" label for every account.
// Not a real keypair - the RELAYER is the sole on-chain caller; this is a leaderboard/index key only.
export function deriveAddress(userId: string): `0x${string}` {
  const hash = keccak256(toBytes(userId));           // 0x + 64 hex chars
  return getAddress(("0x" + hash.slice(-40)) as `0x${string}`); // last 20 bytes, checksummed
}
