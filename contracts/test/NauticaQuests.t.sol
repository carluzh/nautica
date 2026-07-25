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
    address partner = address(0xFEED);
    address player = address(0xCAFE);
    address stranger = address(0xD00D);

    bytes32 constant Q = bytes32("q-paid-lionfish");
    bytes32 constant FREE = bytes32("q-crab");

    event QuestCreated(
        bytes32 indexed questId, address indexed creator, string species, string title, uint32 xp, uint256 usdcReward, uint256 funded
    );
    event SightingRecorded(
        address indexed player, bytes32 indexed questId, int64 latE6, int64 lngE6, uint32 xp, uint256 usdc6, bytes32 attestationHash
    );
    event PayoutSettled(address indexed player, bytes32 indexed questId, uint256 usdc6);

    function setUp() public {
        usdc = new MockUSDC();
        quests = new NauticaQuests(admin, relayer, IERC20(address(usdc)));
        usdc.mint(partner, 1_000e6);
    }

    function _createPaid(uint256 funding) internal {
        vm.startPrank(partner);
        usdc.approve(address(quests), funding);
        quests.createQuest(Q, "Lionfish", "Lionfish survey", 40, 6e6, funding);
        vm.stopPrank();
    }

    function _createFree() internal {
        vm.prank(partner);
        quests.createQuest(FREE, "Crab", "Photograph a crab", 5, 0, 0);
    }

    function test_constructor_grantsRoles() public view {
        assertTrue(quests.hasRole(quests.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(quests.hasRole(quests.RELAYER_ROLE(), relayer));
    }

    function test_createQuest_escrowsUsdcAndEmits() public {
        vm.startPrank(partner);
        usdc.approve(address(quests), 18e6);
        vm.expectEmit(true, true, false, true);
        emit QuestCreated(Q, partner, "Lionfish", "Lionfish survey", 40, 6e6, 18e6);
        quests.createQuest(Q, "Lionfish", "Lionfish survey", 40, 6e6, 18e6);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(quests)), 18e6);
        (address creator,,, uint32 xp, uint256 reward, uint256 funded, bool exists) = quests.quests(Q);
        assertEq(creator, partner);
        assertEq(xp, 40);
        assertEq(reward, 6e6);
        assertEq(funded, 18e6);
        assertTrue(exists);
    }

    function test_createQuest_freeNeedsNoUsdc() public {
        _createFree();
        (,,,, uint256 reward, uint256 funded,) = quests.quests(FREE);
        assertEq(reward, 0);
        assertEq(funded, 0);
    }

    function test_createQuest_duplicateReverts() public {
        _createFree();
        vm.prank(partner);
        vm.expectRevert(abi.encodeWithSelector(NauticaQuests.QuestExists.selector, FREE));
        quests.createQuest(FREE, "Crab", "x", 5, 0, 0);
    }

    function test_fundQuest_topsUpEscrow() public {
        _createPaid(6e6);
        vm.startPrank(partner);
        usdc.approve(address(quests), 6e6);
        quests.fundQuest(Q, 6e6);
        vm.stopPrank();
        (,,,,, uint256 funded,) = quests.quests(Q);
        assertEq(funded, 12e6);
    }

    function test_recordCompletion_emitsAndAccruesXpFromQuest() public {
        _createFree();
        vm.expectEmit(true, true, false, true);
        emit SightingRecorded(player, FREE, 38_700000, -9_150000, 5, 0, keccak256("att"));
        vm.prank(relayer);
        quests.recordCompletion(player, FREE, 38_700000, -9_150000, keccak256("att"));
        assertEq(quests.xpOf(player), 5);
        assertTrue(quests.isCompleted(player, FREE));
    }

    function test_recordCompletion_requiresQuest() public {
        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(NauticaQuests.QuestNotFound.selector, FREE));
        quests.recordCompletion(player, FREE, 0, 0, bytes32(0));
    }

    function test_recordCompletion_onlyRelayer() public {
        _createFree();
        bytes32 role = quests.RELAYER_ROLE();
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, stranger, role));
        quests.recordCompletion(player, FREE, 0, 0, bytes32(0));
    }

    function test_recordCompletion_idempotent() public {
        _createFree();
        vm.startPrank(relayer);
        quests.recordCompletion(player, FREE, 0, 0, keccak256("att"));
        vm.expectRevert(abi.encodeWithSelector(NauticaQuests.AlreadyCompleted.selector, player, FREE));
        quests.recordCompletion(player, FREE, 0, 0, keccak256("att"));
        vm.stopPrank();
        assertEq(quests.xpOf(player), 5);
    }

    function test_settlePayout_drawsFromEscrow() public {
        _createPaid(18e6);
        vm.expectEmit(true, true, false, true);
        emit PayoutSettled(player, Q, 6e6);
        vm.prank(relayer);
        quests.settlePayout(player, Q);
        assertEq(usdc.balanceOf(player), 6e6);
        assertEq(quests.totalSettled(), 6e6);
        (,,,,, uint256 funded,) = quests.quests(Q);
        assertEq(funded, 12e6); // 18 - 6
    }

    function test_createQuest_paidRequiresFunding() public {
        vm.startPrank(partner);
        usdc.approve(address(quests), 3e6);
        vm.expectRevert(abi.encodeWithSelector(NauticaQuests.QuestUnderfunded.selector, Q, 6e6, 3e6));
        quests.createQuest(Q, "Lionfish", "Lionfish survey", 40, 6e6, 3e6); // funds < reward
        vm.stopPrank();
    }

    function test_settlePayout_revertsWhenEscrowDrained() public {
        _createPaid(6e6); // exactly one payout's worth
        vm.startPrank(relayer);
        quests.settlePayout(player, Q); // drains escrow to 0
        vm.expectRevert(abi.encodeWithSelector(NauticaQuests.QuestUnderfunded.selector, Q, 6e6, 0));
        quests.settlePayout(stranger, Q); // second payout can't be covered
        vm.stopPrank();
        assertEq(usdc.balanceOf(player), 6e6);
    }

    function test_settlePayout_freeQuestNoTransfer() public {
        _createFree();
        vm.prank(relayer);
        quests.settlePayout(player, FREE); // reward 0 -> emits, transfers nothing
        assertEq(usdc.balanceOf(player), 0);
    }

    function test_pause_blocksRecording() public {
        _createFree();
        vm.prank(admin);
        quests.pause();
        vm.prank(relayer);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        quests.recordCompletion(player, FREE, 0, 0, bytes32(0));
    }

    function test_withdrawUsdc_adminRescues() public {
        _createPaid(18e6);
        vm.prank(admin);
        quests.withdrawUsdc(admin, 18e6);
        assertEq(usdc.balanceOf(admin), 18e6);
    }
}
