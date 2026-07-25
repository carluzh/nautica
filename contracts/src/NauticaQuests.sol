// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title NauticaQuests
/// @notice On-chain quest registry + trusted-attestor completion recorder for Nautica.
///         A partner creates a quest and escrows its USDC reward pool in the same call
///         (createQuest). After the 0G TEE classifier passes a photo, the backend
///         relayer records the sighting and settles the payout straight from that
///         quest's escrow. Players never self-attest, and a quest can only pay out
///         what its partner funded.
/// @dev    Events are the canonical source indexed by the Nautica subgraph. Quest
///         metadata (species/title/reward) lives on-chain, so the subgraph no longer
///         needs an off-chain registry — it reads it from QuestCreated.
contract NauticaQuests is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Role held by the backend relayer that records verified completions.
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    /// @notice USDC token used for partner payouts (6 decimals on Base).
    IERC20 public immutable usdc;

    struct Quest {
        address creator; // the partner that created + funds the quest
        string species; // SpeciesId string, resolved on-chain (no off-chain registry)
        string title;
        uint32 xp; // XP awarded per completion
        uint256 usdcReward; // USDC (6-dec) paid per completion (0 for free quests)
        uint256 funded; // remaining escrow available for payouts
        bool exists;
    }

    /// @notice questId (utf8 app id, right-padded to bytes32) => quest.
    mapping(bytes32 => Quest) public quests;

    /// @notice keccak256(player, questId) => whether this quest was already recorded.
    mapping(bytes32 => bool) public completed;

    /// @notice Cumulative XP per player (on-chain leaderboard source of truth).
    mapping(address => uint256) public xpOf;

    /// @notice Total USDC settled to players over the contract's lifetime.
    uint256 public totalSettled;

    event QuestCreated(
        bytes32 indexed questId,
        address indexed creator,
        string species,
        string title,
        uint32 xp,
        uint256 usdcReward,
        uint256 funded
    );
    event QuestFunded(bytes32 indexed questId, address indexed funder, uint256 amount, uint256 totalFunded);
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
    event PlayerRegistered(address indexed player, string handle);

    error ZeroAddress();
    error QuestExists(bytes32 questId);
    error QuestNotFound(bytes32 questId);
    error AlreadyCompleted(address player, bytes32 questId);
    error QuestUnderfunded(bytes32 questId, uint256 needed, uint256 funded);

    constructor(address admin, address relayer, IERC20 _usdc) {
        if (admin == address(0) || relayer == address(0) || address(_usdc) == address(0)) {
            revert ZeroAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RELAYER_ROLE, relayer);
        usdc = _usdc;
    }

    // --- Partner: create + fund quests ---------------------------------------

    /// @notice Create a quest and escrow `funding` USDC (pulled from the caller) in
    ///         one call. Permissionless: any partner can fund their own quest. The
    ///         caller must have approved `funding` USDC to this contract first.
    /// @dev    A paid quest can't be advertised without backing it: `funding` must
    ///         cover at least one payout (>= usdcReward). Free quests fund nothing.
    function createQuest(
        bytes32 questId,
        string calldata species,
        string calldata title,
        uint32 xp,
        uint256 usdcReward,
        uint256 funding
    ) external whenNotPaused {
        if (quests[questId].exists) revert QuestExists(questId);
        if (usdcReward > 0 && funding < usdcReward) revert QuestUnderfunded(questId, usdcReward, funding);
        quests[questId] =
            Quest({creator: msg.sender, species: species, title: title, xp: xp, usdcReward: usdcReward, funded: 0, exists: true});
        if (funding > 0) {
            quests[questId].funded = funding;
            usdc.safeTransferFrom(msg.sender, address(this), funding);
        }
        emit QuestCreated(questId, msg.sender, species, title, xp, usdcReward, quests[questId].funded);
    }

    /// @notice Top up an existing quest's escrow with more USDC.
    function fundQuest(bytes32 questId, uint256 amount) external whenNotPaused {
        Quest storage q = quests[questId];
        if (!q.exists) revert QuestNotFound(questId);
        q.funded += amount;
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit QuestFunded(questId, msg.sender, amount, q.funded);
    }

    // --- Relayer: record completions + settle payouts ------------------------

    /// @notice Record a verified quest completion. Idempotent per (player, questId).
    ///         XP and payout are read from the on-chain quest, so the relayer cannot
    ///         inflate them.
    function recordCompletion(address player, bytes32 questId, int64 latE6, int64 lngE6, bytes32 attestation)
        external
        onlyRole(RELAYER_ROLE)
        whenNotPaused
    {
        if (player == address(0)) revert ZeroAddress();
        Quest storage q = quests[questId];
        if (!q.exists) revert QuestNotFound(questId);
        bytes32 key = keccak256(abi.encodePacked(player, questId));
        if (completed[key]) revert AlreadyCompleted(player, questId);
        completed[key] = true;
        xpOf[player] += q.xp;
        emit SightingRecorded(player, questId, latE6, lngE6, q.xp, q.usdcReward, attestation);
    }

    /// @notice Settle a quest's USDC reward to a player, drawn from that quest's
    ///         escrow. Reverts if the escrow can't cover the reward.
    function settlePayout(address player, bytes32 questId)
        external
        onlyRole(RELAYER_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (player == address(0)) revert ZeroAddress();
        Quest storage q = quests[questId];
        if (!q.exists) revert QuestNotFound(questId);
        uint256 amount = q.usdcReward;
        if (amount > 0) {
            if (q.funded < amount) revert QuestUnderfunded(questId, amount, q.funded);
            q.funded -= amount;
            totalSettled += amount;
            usdc.safeTransfer(player, amount);
        }
        emit PayoutSettled(player, questId, amount);
    }

    /// @notice Associate a display handle with a player (optional identity event).
    function registerPlayer(address player, string calldata handle) external onlyRole(RELAYER_ROLE) {
        if (player == address(0)) revert ZeroAddress();
        emit PlayerRegistered(player, handle);
    }

    // --- Views ---------------------------------------------------------------

    function isCompleted(address player, bytes32 questId) external view returns (bool) {
        return completed[keccak256(abi.encodePacked(player, questId))];
    }

    // --- Admin ---------------------------------------------------------------

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Rescue USDC held by the contract (e.g. an over-funded or wound-down
    ///         quest). Admin-gated escape hatch.
    function withdrawUsdc(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        usdc.safeTransfer(to, amount);
    }
}
