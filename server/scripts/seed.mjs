// Seeds the deployed contract so the subgraph has data: creates the daily quests
// on-chain (QuestCreated), registers demo players, and records their free-quest
// completions (SightingRecorded). Partner USDC funding + the paid payout are done
// separately in fund-and-pay.mjs (they need test USDC in the wallet).
//
//   node server/scripts/seed.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createWalletClient, createPublicClient, http, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const root = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const pk = readFileSync(root("contracts/.env"), "utf8").match(/DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]+)/)?.[1];
const address = process.env.CONTRACT || readFileSync(root("subgraph/networks.json"), "utf8").match(/"address":\s*"(0x[0-9a-fA-F]+)"/)?.[1];
const abi = JSON.parse(readFileSync(root("subgraph/abis/NauticaQuests.json"), "utf8"));

if (!pk || !address || /^0x0+$/.test(address)) {
  console.error("Missing relayer key or deployed contract address. Deploy + wire first.");
  process.exit(1);
}

const account = privateKeyToAccount(pk);
const transport = http("https://sepolia.base.org");
const wallet = createWalletClient({ account, chain: baseSepolia, transport });
const pub = createPublicClient({ chain: baseSepolia, transport });

// Same bytes32 encoding the backend relayer uses (server/src/services/chain.ts).
const questId = (q) => `0x${Buffer.from(q).toString("hex").slice(0, 64).padEnd(64, "0")}`;
const e6 = (n) => BigInt(Math.round(n * 1_000_000));
const att = (s) => keccak256(Buffer.from(s));

const P1 = "0x1111111111111111111111111111111111111111";
const P2 = "0x2222222222222222222222222222222222222222";

// Free quests only. The paid quest can't be created without escrowing its reward
// (the contract enforces it), so its full create->fund->complete->pay lifecycle
// lives in fund-and-pay.mjs. [appId, species, title, xp, usdcReward]
const quests = [
  ["q-crab", "Crab", "Photograph a crab", 5, 0],
  ["q-jelly", "Jellyfish", "Log a jellyfish sighting", 25, 0],
  ["q-plant", "ShorePlant", "Photograph a shore plant", 10, 0],
];
const players = [
  [P1, "reef-scout"],
  [P2, "tide-walker"],
];
const sightings = [
  [P1, "q-crab", 38.71, -9.14],
  [P1, "q-jelly", 38.735, -9.16],
  [P2, "q-plant", 38.702, -9.148],
];

async function send(fn, args) {
  const hash = await wallet.writeContract({ address, abi, functionName: fn, args });
  await pub.waitForTransactionReceipt({ hash });
  console.log(`  ${fn}(${String(args[0]).slice(0, 12)}…) -> ${hash}`);
}

console.log(`Seeding ${address} from ${account.address}…`);
for (const [id, species, title, xp, usdc] of quests) {
  await send("createQuest", [questId(id), species, title, xp, e6(usdc), 0n]); // 0 funding here
}
for (const [addr, handle] of players) await send("registerPlayer", [addr, handle]);
for (const [addr, q, lat, lng] of sightings) {
  await send("recordCompletion", [addr, questId(q), e6(lat), e6(lng), att(`${addr}:${q}`)]);
}
console.log("Seed complete. Run fund-and-pay.mjs (needs test USDC) for the paid quest's create->fund->complete->pay lifecycle.");
