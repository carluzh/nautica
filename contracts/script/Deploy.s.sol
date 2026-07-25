// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {NauticaQuests} from "../src/NauticaQuests.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Deploys NauticaQuests. Reads config from env:
///   DEPLOYER_PRIVATE_KEY  (required) — funds the deploy; default admin + relayer.
///   ADMIN_ADDRESS         (optional) — DEFAULT_ADMIN_ROLE holder (default: deployer).
///   RELAYER_ADDRESS       (optional) — RELAYER_ROLE holder    (default: deployer).
///   USDC_ADDRESS          (optional) — USDC token (default: Base Sepolia USDC).
///
/// Usage:
///   forge script script/Deploy.s.sol:Deploy --rpc-url base_sepolia --broadcast
contract Deploy is Script {
    // Circle test USDC on Base Sepolia.
    address constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external returns (NauticaQuests quests) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address admin = vm.envOr("ADMIN_ADDRESS", deployer);
        address relayer = vm.envOr("RELAYER_ADDRESS", deployer);
        address usdc = vm.envOr("USDC_ADDRESS", BASE_SEPOLIA_USDC);

        vm.startBroadcast(pk);
        quests = new NauticaQuests(admin, relayer, IERC20(usdc));
        vm.stopBroadcast();

        console2.log("NauticaQuests:", address(quests));
        console2.log("admin:", admin);
        console2.log("relayer:", relayer);
        console2.log("usdc:", usdc);
        console2.log("deployBlock:", block.number);
    }
}
