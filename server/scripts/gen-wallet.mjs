// Generates a fresh Base Sepolia deploy/relayer wallet and writes the private key
// to contracts/.env (gitignored). Prints ONLY the address to fund. Testnet only.
//
//   node server/scripts/gen-wallet.mjs
//
// Refuses to overwrite an existing contracts/.env so an already-funded key is safe.

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const envPath = fileURLToPath(new URL("../../contracts/.env", import.meta.url));

if (existsSync(envPath)) {
  console.error(`Refusing to overwrite ${envPath} (delete it first to regenerate).`);
  process.exit(1);
}

const pk = generatePrivateKey();
const account = privateKeyToAccount(pk);

writeFileSync(
  envPath,
  [
    "# Nautica deploy + relayer wallet — Base Sepolia, TESTNET ONLY. Gitignored.",
    "# Never fund with real assets or reuse on mainnet.",
    `DEPLOYER_PRIVATE_KEY=${pk}`,
    "",
  ].join("\n"),
  { mode: 0o600 },
);

console.log("\nNautica deploy wallet created (key saved to contracts/.env).\n");
console.log(`  ADDRESS:  ${account.address}\n`);
console.log("Fund it with Base Sepolia ETH (a little goes far), e.g.:");
console.log("  - https://www.alchemy.com/faucets/base-sepolia");
console.log("  - https://faucet.quicknode.com/base/sepolia");
console.log("  - Coinbase Developer Platform faucet\n");
console.log("Then tell me it's funded and I'll deploy the contract + subgraph.\n");
