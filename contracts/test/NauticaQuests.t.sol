// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {NauticaQuests} from "../src/NauticaQuests.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract NauticaQuestsTest is Test {
    NauticaQuests quests;
    MockUSDC usdc;

    address admin = address(0xA11CE);
    address relayer = address(0xBEEF);
    address player = address(0xCAFE);
    address stranger = address(0xD00D);

    bytes32 constant QUEST = bytes32("q-crab");

    event SightingRecorded(
        address indexed player,
        bytes32 indexed questId,
        int64 latE6,
        int64 lngE6,
        uint32 xp,
        uint256 usdc6,
        bytes32 attestationHash
    );
    event PayoutSettled(address indexed player, bytes32 indexed questId, uint256 usdc6);

    function setUp() public {
        usdc = new MockUSDC();
        quests = new NauticaQuests(admin, relayer, IERC20(address(usdc)));
    }

    function _record() internal {
        vm.prank(relayer);
        quests.recordCompletion(player, QUEST, 38_700000, -9_150000, 25, 0, keccak256("att"));
    }

    function test_constructor_grantsRoles() public view {
        assertTrue(quests.hasRole(quests.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(quests.hasRole(quests.RELAYER_ROLE(), relayer));
    }

    function test_constructor_rejectsZeroAddress() public {
        vm.expectRevert(NauticaQuests.ZeroAddress.selector);
        new NauticaQuests(address(0), relayer, IERC20(address(usdc)));
    }

    function test_recordCompletion_emitsAndAccruesXp() public {
        vm.expectEmit(true, true, false, true);
        emit SightingRecorded(player, QUEST, 38_700000, -9_150000, 25, 0, keccak256("att"));
        _record();
        assertEq(quests.xpOf(player), 25);
        assertTrue(quests.isCompleted(player, QUEST));
    }

    function test_recordCompletion_onlyRelayer() public {
        bytes32 role = quests.RELAYER_ROLE(); // resolve before pranking (view call consumes prank)
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, role)
        );
        quests.recordCompletion(player, QUEST, 0, 0, 5, 0, bytes32(0));
    }

    function test_recordCompletion_idempotent() public {
        _record();
        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(NauticaQuests.AlreadyCompleted.selector, player, QUEST));
        quests.recordCompletion(player, QUEST, 0, 0, 25, 0, keccak256("att"));
        assertEq(quests.xpOf(player), 25); // not double-awarded
    }

    function test_recordCompletion_differentQuestsAccumulate() public {
        _record();
        vm.prank(relayer);
        quests.recordCompletion(player, bytes32("q-jelly"), 0, 0, 10, 0, bytes32(0));
        assertEq(quests.xpOf(player), 35);
    }

    function test_settlePayout_transfersUsdc() public {
        usdc.mint(address(quests), 100e6);
        vm.expectEmit(true, true, false, true);
        emit PayoutSettled(player, QUEST, 6e6);
        vm.prank(relayer);
        quests.settlePayout(player, QUEST, 6e6);
        assertEq(usdc.balanceOf(player), 6e6);
        assertEq(quests.totalSettled(), 6e6);
    }

    function test_settlePayout_revertsWhenUnderfunded() public {
        vm.prank(relayer);
        vm.expectRevert();
        quests.settlePayout(player, QUEST, 6e6);
    }

    function test_settlePayout_onlyRelayer() public {
        vm.prank(stranger);
        vm.expectRevert();
        quests.settlePayout(player, QUEST, 0);
    }

    function test_pause_blocksRecording() public {
        vm.prank(admin);
        quests.pause();
        vm.prank(relayer);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        quests.recordCompletion(player, QUEST, 0, 0, 5, 0, bytes32(0));
    }

    function test_pause_onlyAdmin() public {
        vm.prank(relayer);
        vm.expectRevert();
        quests.pause();
    }

    function test_withdrawUsdc_adminRescues() public {
        usdc.mint(address(quests), 50e6);
        vm.prank(admin);
        quests.withdrawUsdc(admin, 50e6);
        assertEq(usdc.balanceOf(admin), 50e6);
    }

    function testFuzz_recordCompletion_xpAccrues(uint32 a, uint32 b) public {
        vm.assume(a > 0 && b > 0);
        vm.startPrank(relayer);
        quests.recordCompletion(player, bytes32("q1"), 0, 0, a, 0, bytes32(0));
        quests.recordCompletion(player, bytes32("q2"), 0, 0, b, 0, bytes32(0));
        vm.stopPrank();
        assertEq(quests.xpOf(player), uint256(a) + uint256(b));
    }
}
