// Emits a handful of real SightingRecorded / PlayerRegistered events from the
// relayer wallet so the deployed subgraph has data to index (leaderboard, gallery,
// plausibility). Run after wire-config.
//
//   node server/scripts/seed.mjs
//
// Needs the relayer to hold RELAYER_ROLE (the deployer does) and a little Base
// Sepolia ETH for gas. USDC payouts are skipped (they need the contract funded
// with test USDC); the free-quest events are what power the Graph demo.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createWalletClient, createPublicClient, http, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const root = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const pk = readFileSync(root("contracts/.env"), "utf8").match(/DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]+)/)?.[1];
const address = process.env.CONTRACT || readFileSync(root("subgraph/networks.json"), "utf8").match(/"address":\s*"(0x[0-9a-fA-F]+)"/)?.[1];
const abi = JSON.parse(readFileSync(root("subgraph/abis/NauticaQuests.json"), "utf8"));

if (!pk || !address || address === "0x0000000000000000000000000000000000000000") {
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

// Two demo players near Lisbon; the lionfish is the invasive-here plausibility beat.
const P1 = "0x1111111111111111111111111111111111111111";
const P2 = "0x2222222222222222222222222222222222222222";

const players = [
  [P1, "reef-scout"],
  [P2, "tide-walker"],
];
const sightings = [
  [P1, "q-crab", 38.71, -9.14, 5, 0],
  [P1, "q-jelly", 38.735, -9.16, 25, 0],
  [P2, "q-plant", 38.702, -9.148, 10, 0],
  [P2, "q-paid-lionfish", 38.72, -9.13, 40, 6],
];

async function send(fn, args) {
  const hash = await wallet.writeContract({ address, abi, functionName: fn, args });
  await pub.waitForTransactionReceipt({ hash });
  console.log(`  ${fn}(${args.slice(0, 2).join(", ")}…) -> ${hash}`);
}

console.log(`Seeding ${address} from ${account.address}…`);
for (const [addr, handle] of players) await send("registerPlayer", [addr, handle]);
for (const [addr, q, lat, lng, xp, usdc] of sightings) {
  await send("recordCompletion", [addr, questId(q), e6(lat), e6(lng), xp, e6(usdc), att(`${addr}:${q}`)]);
}
console.log("Seed complete. Give the subgraph a minute to index, then query it.");
