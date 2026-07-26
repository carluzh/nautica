// Creates the funded, single-image "starfish" paid quest on-chain (createQuest
// escrows the USDC reward; the contract rejects an underfunded paid quest). The
// live completion + payout happen during the demo. Needs test USDC in the wallet.
//
//   node server/scripts/create-starfish.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
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

const Q = questId("q-paid-seastar");
const REWARD = e6(1); // 1 USDC per completion (many demo takes)
const FUND = e6(8); // fund eight payouts (keeps a relayer USDC buffer)

const bal = await pub.readContract({ address: USDC, abi: erc20, functionName: "balanceOf", args: [account.address] });
if (bal < FUND) {
  console.error(`Wallet holds ${Number(bal) / 1e6} test USDC; need ${Number(FUND) / 1e6}. Faucet -> ${account.address}`);
  process.exit(1);
}

async function send(desc, req) {
  const hash = await wallet.writeContract(req);
  await pub.waitForTransactionReceipt({ hash });
  console.log(`  ${desc} -> ${hash}`);
}

console.log(`Creating q-paid-starfish on ${address} from ${account.address}…`);
await send("approve USDC", { address: USDC, abi: erc20, functionName: "approve", args: [address, FUND] });
await send("createQuest(starfish, funded 10 USDC)", {
  address, abi, functionName: "createQuest",
  args: [Q, "SeaStar", "Starfish survey (paid)", 40, REWARD, FUND],
});
console.log("Done. q-paid-starfish is live on-chain and funded. Completion + payout happen live in the demo.");
