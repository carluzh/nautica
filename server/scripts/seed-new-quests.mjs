// Creates ONLY the new smart-quest ids on-chain (idempotent: an id that already
// exists just logs and continues). The original seed.mjs creates the full legacy
// set + demo players; this one is safe to re-run after a content refresh.
//
//   node server/scripts/seed-new-quests.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const root = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const pk = readFileSync(root("contracts/.env"), "utf8").match(/DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]+)/)?.[1];
const address = process.env.CONTRACT || readFileSync(root("subgraph/networks.json"), "utf8").match(/"address":\s*"(0x[0-9a-fA-F]+)"/)?.[1];
const abi = JSON.parse(readFileSync(root("subgraph/abis/NauticaQuests.json"), "utf8"));

if (!pk || !address || /^0x0+$/.test(address)) {
  console.error("Missing relayer key or deployed contract address.");
  process.exit(1);
}

const account = privateKeyToAccount(pk);
const transport = http("https://sepolia.base.org");
const wallet = createWalletClient({ account, chain: baseSepolia, transport });
const pub = createPublicClient({ chain: baseSepolia, transport });

const questId = (q) => `0x${Buffer.from(q).toString("hex").slice(0, 64).padEnd(64, "0")}`;

// New XP-only playful quests. [id, species, title, xp]. q-crab (xp 5) and q-star (xp 25)
// already exist on-chain; re-running just skips them. Display rewards live in content.ts.
const quests = [
  ["q-selfie-sea", "Other", "Sea selfie", 5],
  ["q-color-stone", "Other", "Colorful stone", 5],
  ["q-color-fish", "ShoreFish", "Rainbow fish", 15],
  ["q-star", "SeaStar", "Starfish trophy", 25],
  ["q-duo", "Other", "Two's company", 25],
];

console.log(`Seeding new quests on ${address} from ${account.address}…`);
for (const [id, species, title, xp] of quests) {
  try {
    const hash = await wallet.writeContract({
      address,
      abi,
      functionName: "createQuest",
      args: [questId(id), species, title, xp, 0n, 0n], // 0 USDC reward + 0 funding
    });
    await pub.waitForTransactionReceipt({ hash });
    console.log(`  createQuest(${id}) -> ${hash}`);
  } catch (err) {
    const msg = String(err?.shortMessage || err?.message || err);
    if (/exists|already/i.test(msg)) console.log(`  ${id}: already on-chain, skipped`);
    else {
      console.error(`  ${id}: FAILED - ${msg}`);
      process.exitCode = 1;
    }
  }
}
console.log("Done.");
