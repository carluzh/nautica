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

// Aligned with the deployed NauticaQuests ABI (subgraph/abis/NauticaQuests.json).
// XP and USDC reward are read from the on-chain quest, so recordCompletion/settlePayout
// don't pass them; the tx emits SightingRecorded/PayoutSettled which the subgraph indexes.
// createQuest/fundQuest are for partner-side quest funding (not the runtime submit path).
const QUEST_ABI = parseAbi([
  "function recordCompletion(address player, bytes32 questId, int64 latE6, int64 lngE6, bytes32 attestation) external",
  "function settlePayout(address player, bytes32 questId) external",
  "function createQuest(bytes32 questId, string species, string title, uint32 xp, uint256 usdcReward, uint256 funding) external",
  "function fundQuest(bytes32 questId, uint256 amount) external",
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

/** microdegrees for an int64 lat/lng column. */
function toE6(v: number): bigint {
  return BigInt(Math.round(v * 1_000_000));
}

export async function recordQuestCompletion(input: {
  wallet: string | null;
  questId: string;
  lat: number;
  lng: number;
  attestationHash: string;
}): Promise<{ txHash: Hex; simulated: boolean }> {
  if (!integrations.chain || !input.wallet) {
    log.info("chain: simulated recordCompletion", { questId: input.questId });
    return { txHash: simulatedTx(), simulated: true };
  }
  const attestation = (input.attestationHash.startsWith("0x")
    ? input.attestationHash.slice(0, 66).padEnd(66, "0")
    : `0x${input.attestationHash}`) as Hex;
  const txHash = await walletClient().writeContract({
    address: config.QUEST_CONTRACT_ADDRESS as Hex,
    abi: QUEST_ABI,
    functionName: "recordCompletion",
    args: [input.wallet as Hex, questIdToBytes32(input.questId), toE6(input.lat), toE6(input.lng), attestation],
  });
  return { txHash, simulated: false };
}

export async function settlePayout(input: {
  wallet: string | null;
  questId: string;
}): Promise<{ txHash: Hex; simulated: boolean }> {
  if (!integrations.chain || !input.wallet) {
    log.info("chain: simulated settlePayout", { questId: input.questId });
    return { txHash: simulatedTx(), simulated: true };
  }
  const txHash = await walletClient().writeContract({
    address: config.QUEST_CONTRACT_ADDRESS as Hex,
    abi: QUEST_ABI,
    functionName: "settlePayout",
    args: [input.wallet as Hex, questIdToBytes32(input.questId)],
  });
  return { txHash, simulated: false };
}
