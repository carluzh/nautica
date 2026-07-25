// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title NauticaQuests
/// @notice Trusted-attestor registry for Nautica. After a photo passes the 0G TEE
///         classifier, the backend relayer records the sighting on-chain and settles
///         any partner USDC payout here. Players never self-attest: only the relayer
///         role can write, so the leaderboard and payouts are tamper-evident.
/// @dev    Events are the canonical source indexed by the Nautica subgraph. XP and
///         completion state are also kept on-chain so they can be read directly and
///         so double-completion is impossible even if the backend is compromised.
contract NauticaQuests is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Role held by the backend relayer that submits verified completions.
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    /// @notice USDC token used for partner payouts (6 decimals on Base).
    IERC20 public immutable usdc;

    /// @notice keccak256(player, questId) => whether this quest was already recorded.
    mapping(bytes32 => bool) public completed;

    /// @notice Cumulative XP per player (on-chain leaderboard source of truth).
    mapping(address => uint256) public xpOf;

    /// @notice Total USDC settled to players over the contract's lifetime.
    uint256 public totalSettled;

    /// @param player          The player credited with the sighting.
    /// @param questId          App quest id (utf8 right-padded to bytes32).
    /// @param latE6            Latitude * 1e6 (microdegrees).
    /// @param lngE6            Longitude * 1e6 (microdegrees).
    /// @param xp               XP awarded for the completion.
    /// @param usdc6            Partner reward in USDC 6-dec (0 for free quests).
    /// @param attestationHash  Digest of the 0G TEE attestation.
    event SightingRecorded(
        address indexed player,
        bytes32 indexed questId,
        int64 latE6,
        int64 lngE6,
        uint32 xp,
        uint256 usdc6,
        bytes32 attestationHash
    );

    /// @notice Emitted when a partner USDC payout is transferred to a player.
    event PayoutSettled(address indexed player, bytes32 indexed questId, uint256 usdc6);

    /// @notice Optional on-chain identity: associates a display handle with a player.
    event PlayerRegistered(address indexed player, string handle);

    error ZeroAddress();
    error AlreadyCompleted(address player, bytes32 questId);

    /// @param admin   Holds DEFAULT_ADMIN_ROLE (pause, role management, USDC rescue).
    /// @param relayer Backend signer allowed to record completions and settle payouts.
    /// @param _usdc   USDC token address on the target network.
    constructor(address admin, address relayer, IERC20 _usdc) {
        if (admin == address(0) || relayer == address(0) || address(_usdc) == address(0)) {
            revert ZeroAddress();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RELAYER_ROLE, relayer);
        usdc = _usdc;
    }

    /// @notice Record a verified quest completion. Idempotent per (player, questId).
    /// @dev    Reverts AlreadyCompleted on replay so XP can never be double-awarded.
    function recordCompletion(
        address player,
        bytes32 questId,
        int64 latE6,
        int64 lngE6,
        uint32 xp,
        uint256 usdc6,
        bytes32 attestation
    ) external onlyRole(RELAYER_ROLE) whenNotPaused {
        if (player == address(0)) revert ZeroAddress();
        bytes32 key = keccak256(abi.encodePacked(player, questId));
        if (completed[key]) revert AlreadyCompleted(player, questId);
        completed[key] = true;
        xpOf[player] += xp;
        emit SightingRecorded(player, questId, latE6, lngE6, xp, usdc6, attestation);
    }

    /// @notice Settle a partner USDC payout to a player. Transfers `amount` of USDC
    ///         held by this contract; reverts if the balance is insufficient.
    function settlePayout(address player, bytes32 questId, uint256 amount)
        external
        onlyRole(RELAYER_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (player == address(0)) revert ZeroAddress();
        if (amount > 0) {
            totalSettled += amount;
            usdc.safeTransfer(player, amount);
        }
        emit PayoutSettled(player, questId, amount);
    }

    /// @notice Associate a display handle with a player (optional identity event).
    function registerPlayer(address player, string calldata handle)
        external
        onlyRole(RELAYER_ROLE)
    {
        if (player == address(0)) revert ZeroAddress();
        emit PlayerRegistered(player, handle);
    }

    /// @notice Whether a given quest has already been recorded for a player.
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

    /// @notice Rescue USDC held by the contract (e.g. to top up or wind down).
    function withdrawUsdc(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        usdc.safeTransfer(to, amount);
    }
}
