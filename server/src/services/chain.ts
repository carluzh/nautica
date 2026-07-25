import { randomBytes } from "node:crypto";
import { createWalletClient, http, parseAbi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { config, integrations } from "../config";
import { log } from "../lib/logger";

// Trusted-attestor relayer. After 0G passes a submission the SERVER (not the
// client) records the completion + settles the USDC payout on Base — the user
// can never self-attest. STUBBED: without a relayer key + contract address it
// returns a simulated tx hash. The viem write path is structured against a
// placeholder ABI so wiring the real contract (dev C) is a drop-in.

const QUEST_ABI = parseAbi([
  "function recordCompletion(address player, bytes32 questId, uint256 xp, bytes32 attestation) external",
  "function settlePayout(address player, uint256 amount) external",
]);

function simulatedTx(): Hex {
  return `0x${randomBytes(32).toString("hex")}`;
}

function walletClient() {
  const chain = config.CHAIN_ID === base.id ? base : baseSepolia;
  const account = privateKeyToAccount(config.RELAYER_PRIVATE_KEY as Hex);
  return createWalletClient({ account, chain, transport: http(config.CHAIN_RPC_URL) });
}

function questIdToBytes32(questId: string): Hex {
  // Placeholder mapping; the real scheme should match the contract's id encoding.
  const hex = Buffer.from(questId).toString("hex").slice(0, 64).padEnd(64, "0");
  return `0x${hex}`;
}

export async function recordQuestCompletion(input: {
  wallet: string | null;
  questId: string;
  xp: number;
  attestationHash: string;
}): Promise<{ txHash: Hex; simulated: boolean }> {
  if (!integrations.chain || !input.wallet) {
    log.info("chain: simulated recordCompletion", { questId: input.questId, xp: input.xp });
    return { txHash: simulatedTx(), simulated: true };
  }
  const attestation = (input.attestationHash.startsWith("0x")
    ? input.attestationHash.slice(0, 66).padEnd(66, "0")
    : `0x${input.attestationHash}`) as Hex;
  const txHash = await walletClient().writeContract({
    address: config.QUEST_CONTRACT_ADDRESS as Hex,
    abi: QUEST_ABI,
    functionName: "recordCompletion",
    args: [input.wallet as Hex, questIdToBytes32(input.questId), BigInt(input.xp), attestation],
  });
  return { txHash, simulated: false };
}

export async function settlePayout(input: {
  wallet: string | null;
  usdc: number;
}): Promise<{ txHash: Hex; simulated: boolean }> {
  if (!integrations.chain || !input.wallet) {
    log.info("chain: simulated settlePayout", { usdc: input.usdc });
    return { txHash: simulatedTx(), simulated: true };
  }
  // USDC has 6 decimals on Base.
  const amount = BigInt(Math.round(input.usdc * 1_000_000));
  const txHash = await walletClient().writeContract({
    address: config.QUEST_CONTRACT_ADDRESS as Hex,
    abi: QUEST_ABI,
    functionName: "settlePayout",
    args: [input.wallet as Hex, amount],
  });
  return { txHash, simulated: false };
}
