import { randomBytes } from "node:crypto";
import { createPublicClient, createWalletClient, http, parseAbi, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { config, integrations } from "../config";
import { log } from "../lib/logger";

// Trusted-attestor relayer. After 0G passes a submission the SERVER (not the
// client) records the completion on Base - the user can never self-attest.
// STUBBED: without a relayer key + contract address it returns a simulated tx
// hash. The viem write path is structured against the deployed ABI so wiring the
// real contract is a drop-in.

// Aligned with the deployed NauticaQuests ABI (subgraph/abis/NauticaQuests.json).
// XP is read from the on-chain quest, so recordCompletion doesn't pass it; the tx
// emits SightingRecorded which the subgraph indexes. registerPlayer sets the
// on-chain handle so a derived guest/email address indexes with a non-blank name.
const QUEST_ABI = parseAbi([
  "function recordCompletion(address player, bytes32 questId, int64 latE6, int64 lngE6, bytes32 attestation) external",
  "function registerPlayer(address player, string handle) external",
  "function createQuest(bytes32 questId, string species, string title, uint32 xp, uint256 usdcReward, uint256 funding) external",
]);

function simulatedTx(): Hex {
  return `0x${randomBytes(32).toString("hex")}`;
}

function chainFor() {
  return config.CHAIN_ID === base.id ? base : baseSepolia;
}

function walletClient() {
  const account = privateKeyToAccount(config.RELAYER_PRIVATE_KEY as Hex);
  return createWalletClient({ account, chain: chainFor(), transport: http(config.CHAIN_RPC_URL) });
}

function publicClient() {
  return createPublicClient({ chain: chainFor(), transport: http(config.CHAIN_RPC_URL) });
}

/** The relayer wallet address (the on-chain caller for the app's writes), or null if unconfigured. */
export function relayerAddress(): Hex | null {
  if (!config.RELAYER_PRIVATE_KEY) return null;
  return privateKeyToAccount(config.RELAYER_PRIVATE_KEY as Hex).address;
}

/** Best-effort: register a derived player address + handle on-chain so the subgraph
 *  indexes it with a name. Never throws (callers fire-and-forget); simulated in stub mode. */
export async function registerPlayerOnchain(input: {
  address: string;
  handle: string;
}): Promise<{ txHash: Hex; simulated: boolean }> {
  if (!integrations.chain) {
    log.info("chain: simulated registerPlayer", { address: input.address });
    return { txHash: simulatedTx(), simulated: true };
  }
  try {
    const txHash = await walletClient().writeContract({
      address: config.QUEST_CONTRACT_ADDRESS as Hex,
      abi: QUEST_ABI,
      functionName: "registerPlayer",
      args: [input.address as Hex, input.handle],
    });
    return { txHash, simulated: false };
  } catch (err) {
    log.error("chain: registerPlayer failed", { err: String(err), address: input.address });
    return { txHash: simulatedTx(), simulated: true };
  }
}

/** Create the quest on-chain so recordCompletion can reference it (the contract
 *  reverts QuestNotFound otherwise). XP-only: reward + funding are always 0.
 *  Stub mode returns a simulated tx. */
export async function createQuestOnchain(input: {
  questId: string;
  species: string;
  title: string;
  xp: number;
}): Promise<{ txHash: Hex; simulated: boolean }> {
  if (!integrations.chain) {
    log.info("chain: simulated createQuest", { questId: input.questId });
    return { txHash: simulatedTx(), simulated: true };
  }
  const txHash = await walletClient().writeContract({
    address: config.QUEST_CONTRACT_ADDRESS as Hex,
    abi: QUEST_ABI,
    functionName: "createQuest",
    args: [questIdToBytes32(input.questId), input.species, input.title, input.xp, 0n, 0n],
  });
  return { txHash, simulated: false };
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
  player: Hex;
  questId: string;
  lat: number;
  lng: number;
  attestationHash: string;
}): Promise<{ txHash: Hex; simulated: boolean }> {
  if (!integrations.chain) {
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
    args: [input.player, questIdToBytes32(input.questId), toE6(input.lat), toE6(input.lng), attestation],
  });
  // Wait for it to land so the returned hash is a real, mined Base tx (not just broadcast).
  const receipt = await publicClient().waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error("recordCompletion reverted on-chain");
  return { txHash, simulated: false };
}
