// After the contract is deployed, wire its address + deploy block into every
// consumer: the subgraph (networks.json + subgraph.yaml) and the backend (.env,
// flipping integrations.chain live). Reads the Foundry broadcast receipt, so it
// needs no arguments.
//
//   node server/scripts/wire-config.mjs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));

const broadcastPath = root("contracts/broadcast/Deploy.s.sol/84532/run-latest.json");
if (!existsSync(broadcastPath)) {
  console.error("No broadcast receipt found - run the deploy first.");
  process.exit(1);
}
const bc = JSON.parse(readFileSync(broadcastPath, "utf8"));
const tx = bc.transactions.find((t) => t.contractAddress);
const address = tx.contractAddress;
const receipt = bc.receipts?.find((r) => r.contractAddress?.toLowerCase() === address.toLowerCase());
const startBlock = receipt ? parseInt(receipt.blockNumber, 16) : 0;
console.log(`contract=${address} startBlock=${startBlock}`);

// 1. subgraph/networks.json
const netPath = root("subgraph/networks.json");
const net = JSON.parse(readFileSync(netPath, "utf8"));
net["base-sepolia"].NauticaQuests = { address, startBlock };
writeFileSync(netPath, JSON.stringify(net, null, 2) + "\n");

// 2. subgraph/subgraph.yaml (address + startBlock lines)
const yamlPath = root("subgraph/subgraph.yaml");
let yaml = readFileSync(yamlPath, "utf8");
yaml = yaml
  .replace(/address: "0x[0-9a-fA-F]+"/, `address: "${address}"`)
  .replace(/startBlock: \d+/, `startBlock: ${startBlock}`);
writeFileSync(yamlPath, yaml);

// 3. server/.env - flip the relayer + chain integration live
const key = readFileSync(root("contracts/.env"), "utf8").match(/DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]+)/)?.[1];
const envPath = root("server/.env");
const upserts = {
  RELAYER_PRIVATE_KEY: key,
  QUEST_CONTRACT_ADDRESS: address,
  CHAIN_ID: "84532",
  CHAIN_RPC_URL: "https://sepolia.base.org",
};
let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
for (const [k, v] of Object.entries(upserts)) {
  const line = `${k}=${v}`;
  env = new RegExp(`^${k}=.*$`, "m").test(env) ? env.replace(new RegExp(`^${k}=.*$`, "m"), line) : `${env.replace(/\n?$/, "\n")}${line}\n`;
}
writeFileSync(envPath, env);

console.log("Wired: subgraph/networks.json, subgraph/subgraph.yaml, server/.env");
