// Demonstrates the full partner-funded paid-quest lifecycle on-chain: create the
// quest WITH its USDC escrow (the contract rejects an underfunded paid quest),
// record a completion, then settle the payout from that quest's escrow. Needs test
// USDC in the deployer wallet (Circle Base Sepolia faucet -> the address).
//
//   node server/scripts/fund-and-pay.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createWalletClient, createPublicClient, http, parseAbi, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const root = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const pk = readFileSync(root("contracts/.env"), "utf8").match(/DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]+)/)?.[1];
const address = readFileSync(root("subgraph/networks.json"), "utf8").match(/"address":\s*"(0x[0-9a-fA-F]+)"/)?.[1];
const abi = JSON.parse(readFileSync(root("subgraph/abis/NauticaQuests.json"), "utf8"));
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
const erc20 = parseAbi(["function approve(address,uint256) returns (bool)", "function balanceOf(address) view returns (uint256)"]);

const account = privateKeyToAccount(pk);
const transport = http("https://sepolia.base.org");
const wallet = createWalletClient({ account, chain: baseSepolia, transport });
const pub = createPublicClient({ chain: baseSepolia, transport });

const questId = (q) => `0x${Buffer.from(q).toString("hex").slice(0, 64).padEnd(64, "0")}`;
const e6 = (n) => BigInt(Math.round(n * 1_000_000));
const Q = questId("q-paid-lionfish");
const P2 = "0x2222222222222222222222222222222222222222"; // tide-walker (registered by seed)
const REWARD = e6(6); // 6 USDC per completion
const FUND = e6(12); // fund two payouts

const bal = await pub.readContract({ address: USDC, abi: erc20, functionName: "balanceOf", args: [account.address] });
if (bal < FUND) {
  console.error(`Wallet holds ${Number(bal) / 1e6} test USDC; need ${Number(FUND) / 1e6}. Faucet: https://faucet.circle.com (Base Sepolia) -> ${account.address}`);
  process.exit(1);
}

async function send(desc, req) {
  const hash = await wallet.writeContract(req);
  await pub.waitForTransactionReceipt({ hash });
  console.log(`  ${desc} -> ${hash}`);
}

await send("approve USDC", { address: USDC, abi: erc20, functionName: "approve", args: [address, FUND] });
await send("createQuest(lionfish, funded 12 USDC)", {
  address, abi, functionName: "createQuest", args: [Q, "Lionfish", "Lionfish survey (paid)", 40, REWARD, FUND],
});
await send("recordCompletion(tide-walker)", {
  address, abi, functionName: "recordCompletion", args: [P2, Q, e6(38.72), e6(-9.13), keccak256(Buffer.from("P2:lionfish"))],
});
await send("settlePayout(tide-walker)", { address, abi, functionName: "settlePayout", args: [P2, Q] });
console.log("Paid quest created (funded), completed, and paid. The subgraph shows the Quest, the sighting, the payout, and the drawn-down escrow.");
