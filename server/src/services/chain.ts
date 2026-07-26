import { randomBytes } from "node:crypto";
import { createPublicClient, createWalletClient, http, parseAbi, parseUnits, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { config, integrations } from "../config";
import { log } from "../lib/logger";

// Trusted-attestor relayer. After 0G passes a submission the SERVER (not the
// client) records the completion + settles the USDC payout on Base - the user
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

// Minimal ERC20 surface for escrowing the reward: approve the quest contract to
// pull `funding` USDC (it transferFrom's the relayer inside createQuest), and read
// the relayer's balance for a friendly preflight before a paid quest is posted.
const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
]);

const USDC_DECIMALS = 6;

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

/** The relayer wallet address (the on-chain caller/funder for the app's writes), or null if unconfigured. */
export function relayerAddress(): Hex | null {
  if (!config.RELAYER_PRIVATE_KEY) return null;
  return privateKeyToAccount(config.RELAYER_PRIVATE_KEY as Hex).address;
}

/** Relayer's USDC balance in whole USDC, or null when chain/USDC/relayer aren't wired (stub mode). */
export async function relayerUsdcBalance(): Promise<number | null> {
  const addr = relayerAddress();
  if (!integrations.chain || !config.USDC_ADDRESS || !addr) return null;
  const raw = await publicClient().readContract({
    address: config.USDC_ADDRESS as Hex,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [addr],
  });
  return Number(raw) / 10 ** USDC_DECIMALS;
}

/** Any wallet's USDC balance in whole USDC (live, read-only), or null in stub mode. */
export async function walletUsdcBalance(wallet: string | null): Promise<number | null> {
  if (!integrations.chain || !config.USDC_ADDRESS || !wallet) return null;
  try {
    const raw = await publicClient().readContract({
      address: config.USDC_ADDRESS as Hex,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [wallet as Hex],
    });
    return Number(raw) / 10 ** USDC_DECIMALS;
  } catch {
    return null;
  }
}

/** Partner-side create + fund. In live mode approves the reward escrow then calls
 *  createQuest (relayer as caller/funder). A FREE quest (funding 0) skips approval
 *  entirely, so it works at a zero USDC balance. Stub mode returns a simulated tx. */
export async function createQuestOnchain(input: {
  questId: string;
  species: string;
  title: string;
  xp: number;
  usdcReward: number;
  funding: number;
}): Promise<{ txHash: Hex; simulated: boolean; approveTxHash?: Hex }> {
  if (!integrations.chain) {
    log.info("chain: simulated createQuest", { questId: input.questId });
    return { txHash: simulatedTx(), simulated: true };
  }
  const rewardWei = parseUnits(String(input.usdcReward), USDC_DECIMALS);
  const fundingWei = parseUnits(String(input.funding), USDC_DECIMALS);

  let approveTxHash: Hex | undefined;
  if (fundingWei > 0n) {
    if (!config.USDC_ADDRESS) throw new Error("USDC_ADDRESS is not configured; cannot escrow a paid quest.");
    approveTxHash = await walletClient().writeContract({
      address: config.USDC_ADDRESS as Hex,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [config.QUEST_CONTRACT_ADDRESS as Hex, fundingWei],
    });
    // Wait for the approval to settle so createQuest's transferFrom can't race it.
    await publicClient().waitForTransactionReceipt({ hash: approveTxHash });
  }

  const txHash = await walletClient().writeContract({
    address: config.QUEST_CONTRACT_ADDRESS as Hex,
    abi: QUEST_ABI,
    functionName: "createQuest",
    args: [questIdToBytes32(input.questId), input.species, input.title, input.xp, rewardWei, fundingWei],
  });
  return { txHash, simulated: false, approveTxHash };
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
  // Wait for it to land so a follow-on settlePayout estimates against fresh state
  // (and the returned hash is a real, mined Base tx, not just a broadcast one).
  const receipt = await publicClient().waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error("recordCompletion reverted on-chain");
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
  // Confirm the payout actually settled before the caller marks it settled.
  const receipt = await publicClient().waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") throw new Error("settlePayout reverted on-chain");
  return { txHash, simulated: false };
}
