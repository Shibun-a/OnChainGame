// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/GameCore.sol";
import "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";

/// @title Handler — drives random actions for invariant testing
contract Handler is Test {
    GameCore public game;
    VRFCoordinatorV2_5Mock public vrfCoordinator;

    address[] public actors;
    uint256[] public allDiceIds;
    uint256[] public allPokerIds;
    uint256[] private pendingDice;
    uint256[] private pendingPoker;

    constructor(GameCore _game, VRFCoordinatorV2_5Mock _vrf) {
        game = _game;
        vrfCoordinator = _vrf;

        for (uint i = 1; i <= 5; i++) {
            address actor = address(uint160(0xBEEF + i));
            actors.push(actor);
            vm.deal(actor, 100 ether);
        }
    }

    // ---- Actions the fuzzer can call ----

    function betDice(uint256 actorIdx, uint256 amount, uint8 multIdx) external {
        address actor = actors[actorIdx % actors.length];
        amount = bound(amount, 0.001 ether, 0.1 ether);
        uint8[3] memory mults = [uint8(2), uint8(5), uint8(10)];
        uint8 mult = mults[multIdx % 3];

        vm.prank(actor);
        try game.betDice{value: amount}(50, mult, address(0), amount) returns (uint256 requestId) {
            allDiceIds.push(requestId);
            pendingDice.push(requestId);
        } catch {}
    }

    function betPoker(uint256 actorIdx, uint256 amount) external {
        address actor = actors[actorIdx % actors.length];
        amount = bound(amount, 0.001 ether, 0.1 ether);

        vm.prank(actor);
        try game.betPoker{value: amount}(0, address(0), amount) returns (uint256 requestId) {
            allPokerIds.push(requestId);
            pendingPoker.push(requestId);
        } catch {}
    }

    function settleDice(uint256 idx, uint256 seed) external {
        if (pendingDice.length == 0) return;
        idx = idx % pendingDice.length;
        uint256 requestId = pendingDice[idx];

        uint256[] memory rw = new uint256[](1);
        rw[0] = seed;
        try vrfCoordinator.fulfillRandomWordsWithOverride(requestId, address(game), rw) {} catch {}

        pendingDice[idx] = pendingDice[pendingDice.length - 1];
        pendingDice.pop();
    }

    function settlePoker(uint256 idx, uint256 seed) external {
        if (pendingPoker.length == 0) return;
        idx = idx % pendingPoker.length;
        uint256 requestId = pendingPoker[idx];

        uint256[] memory rw = new uint256[](1);
        rw[0] = seed;
        try vrfCoordinator.fulfillRandomWordsWithOverride(requestId, address(game), rw) {} catch {}

        pendingPoker[idx] = pendingPoker[pendingPoker.length - 1];
        pendingPoker.pop();
    }

    function setReferrer(uint256 actorIdx, uint256 referrerIdx) external {
        address actor = actors[actorIdx % actors.length];
        address referrer = actors[referrerIdx % actors.length];

        vm.prank(actor);
        try game.setReferrer(referrer) {} catch {}
    }

    // ---- Getters for invariant checks ----

    function getActorCount() external view returns (uint256) {
        return actors.length;
    }

    function allDiceIdsLength() external view returns (uint256) {
        return allDiceIds.length;
    }

    function allPokerIdsLength() external view returns (uint256) {
        return allPokerIds.length;
    }
}

/// @title InvariantTest — checks properties that must hold after any sequence of actions
contract InvariantTest is Test {
    GameCore public game;
    VRFCoordinatorV2_5Mock public vrfCoordinator;
    Handler public handler;

    function setUp() public {
        // Deploy VRF mock
        vrfCoordinator = new VRFCoordinatorV2_5Mock(0.1 ether, 1e9, 4e15);
        uint256 subId = vrfCoordinator.createSubscription();
        vrfCoordinator.fundSubscription(subId, 100 ether);
        vrfCoordinator.fundSubscriptionWithNative{value: 100 ether}(subId);

        // Deploy GameCore
        game = new GameCore(
            address(vrfCoordinator),
            subId,
            0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c
        );
        vrfCoordinator.addConsumer(subId, address(game));

        // Fund reward pool
        vm.deal(address(this), 20 ether);
        game.fundRewardPool{value: 10 ether}();

        // Deploy handler and set as target
        handler = new Handler(game, vrfCoordinator);
        targetContract(address(handler));
    }

    /// @notice Contract ETH balance must always be >= rewardPool (solvency)
    function invariant_solvency() public view {
        assertGe(
            address(game).balance,
            game.rewardPool(),
            "BROKEN: contract balance < rewardPool"
        );
    }

    /// @notice Every dice requestId maps to isDiceRequest == true,
    ///         every poker requestId maps to isDiceRequest == false
    function invariant_betConsistency() public view {
        for (uint i = 0; i < handler.allDiceIdsLength(); i++) {
            assertTrue(
                game.isDiceRequest(handler.allDiceIds(i)),
                "BROKEN: dice requestId has isDiceRequest == false"
            );
        }
        for (uint i = 0; i < handler.allPokerIdsLength(); i++) {
            assertFalse(
                game.isDiceRequest(handler.allPokerIds(i)),
                "BROKEN: poker requestId has isDiceRequest == true"
            );
        }
    }

    /// @notice Each player owns at most 2 achievement NFTs (1 dice + 1 poker)
    function invariant_achievementUniqueness() public view {
        for (uint i = 0; i < handler.getActorCount(); i++) {
            address actor = handler.actors(i);
            assertLe(
                game.balanceOf(actor),
                2,
                "BROKEN: player has > 2 achievement NFTs"
            );
        }
    }

    /// @notice No player can be their own referrer
    function invariant_noSelfReferral() public view {
        for (uint i = 0; i < handler.getActorCount(); i++) {
            address actor = handler.actors(i);
            address ref = game.referrers(actor);
            if (ref != address(0)) {
                assertTrue(
                    ref != actor,
                    "BROKEN: player is their own referrer"
                );
            }
        }
    }

    /// @notice Supported-tokens array and isTokenSupported mapping stay in sync
    function invariant_tokenWhitelistSync() public view {
        address[] memory tokens = game.getSupportedTokens();
        for (uint i = 0; i < tokens.length; i++) {
            assertTrue(
                game.isTokenSupported(tokens[i]),
                "BROKEN: token in array but not in mapping"
            );
        }
    }
}
