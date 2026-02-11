// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/GameCore.sol";
import "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";

contract GameCoreHarness is GameCore {
    constructor(address vrf, uint256 subId, bytes32 key) GameCore(vrf, subId, key) {}
    
    function exposeEvaluateHand(uint8[3] memory cards) external pure returns (uint8) {
        return _evaluateHand(cards);
    }
    
    function exposeCalculateScore(uint8[3] memory cards) external pure returns (uint32) {
        return _calculateScore(cards);
    }
}

contract PokerLogicTest is Test {
    GameCoreHarness public game;
    VRFCoordinatorV2_5Mock public vrfCoordinator;

    function setUp() public {
        vrfCoordinator = new VRFCoordinatorV2_5Mock(0.1 ether, 1e9, 4e15);
        game = new GameCoreHarness(
            address(vrfCoordinator),
            1,
            bytes32(0)
        );
    }

    function testStraightFlush() public {
        // 2, 3, 4 of Suit 0 (Spades)
        // IDs: 2, 3, 4
        uint8[3] memory cards = [2, 3, 4];
        uint8 rank = game.exposeEvaluateHand(cards);
        assertEq(rank, 5, "Should be Straight Flush");
    }

    function testTrips() public {
        // 2 of Spades (2), 2 of Hearts (15), 2 of Diamonds (28)
        // IDs: 2, 15, 28
        uint8[3] memory cards = [2, 15, 28];
        uint8 rank = game.exposeEvaluateHand(cards);
        assertEq(rank, 4, "Should be Three of a Kind");
    }

    function testStraight() public {
        // 2 of Spades (2), 3 of Hearts (16), 4 of Diamonds (30)
        // IDs: 2, 16, 30
        uint8[3] memory cards = [2, 16, 30];
        uint8 rank = game.exposeEvaluateHand(cards);
        assertEq(rank, 3, "Should be Straight");
    }

    function testFlush() public {
        // 2, 4, 6 of Spades
        // IDs: 2, 4, 6
        uint8[3] memory cards = [2, 4, 6];
        uint8 rank = game.exposeEvaluateHand(cards);
        assertEq(rank, 2, "Should be Flush");
    }

    function testPair() public {
        // 2 of Spades (2), 2 of Hearts (15), 4 of Diamonds (30)
        uint8[3] memory cards = [2, 15, 30];
        uint8 rank = game.exposeEvaluateHand(cards);
        assertEq(rank, 1, "Should be Pair");
    }

    function testHighCard() public {
        // 2 of Spades (2), 4 of Hearts (17), 7 of Diamonds (33)
        uint8[3] memory cards = [2, 17, 33];
        uint8 rank = game.exposeEvaluateHand(cards);
        assertEq(rank, 0, "Should be High Card");
    }

    function testAceHighStraight() public {
        // Q, K, A of Spades
        // Q: 12 (Card 12)
        // K: 13 (Card 13)
        // A: 1 (Card 1)
        // Ranks: Q=11+1=12, K=12+1=13, A=0+1=1 -> 14 (in logic)
        // Wait, my logic for A is: if ((card-1)%13 == 0) return 14;
        // So Card 1 is Rank 14.
        // Card 12 is Rank 12.
        // Card 13 is Rank 13.
        // Sorted Ranks: 12, 13, 14.
        // Straight: 12+1=13, 13+1=14. Yes.
        
        uint8[3] memory cards = [12, 13, 1];
        uint8 rank = game.exposeEvaluateHand(cards);
        assertEq(rank, 5, "Should be Straight Flush (Royal)");
    }

    function testAceLowStraight() public {
        // A, 2, 3 of Spades
        // A: 1 (Rank 14)
        // 2: 2 (Rank 2)
        // 3: 3 (Rank 3)
        // Sorted: 2, 3, 14.
        // Logic: if (ranks[0] == 2 && ranks[1] == 3 && ranks[2] == 14) isStraight = true;
        
        uint8[3] memory cards = [1, 2, 3];
        uint8 rank = game.exposeEvaluateHand(cards);
        assertEq(rank, 5, "Should be Straight Flush (Wheel)");
    }
    
    function testScoreComparison() public {
        // SF vs Trips
        uint8[3] memory sf = [2, 3, 4]; // Score ~500k
        uint8[3] memory trips = [13, 26, 39]; // K, K, K. Score ~400k + 13
        
        uint32 scoreSF = game.exposeCalculateScore(sf);
        uint32 scoreTrips = game.exposeCalculateScore(trips);
        
        assertTrue(scoreSF > scoreTrips, "SF should beat Trips");
        
        // Flush vs Pair
        uint8[3] memory flush = [2, 4, 6];
        uint8[3] memory pair = [13, 26, 2]; // K, K, 2
        
        uint32 scoreFlush = game.exposeCalculateScore(flush);
        uint32 scorePair = game.exposeCalculateScore(pair);
        
        assertTrue(scoreFlush > scorePair, "Flush should beat Pair");
    }

    // ============ Fuzz Tests ============

    /// @notice Hand rank is always in [0, 5] for any valid 3-card combination
    function testFuzz_evaluateHandAlwaysValidRank(uint8 c1, uint8 c2, uint8 c3) public {
        c1 = uint8(bound(uint256(c1), 1, 52));
        c2 = uint8(bound(uint256(c2), 1, 52));
        c3 = uint8(bound(uint256(c3), 1, 52));
        vm.assume(c1 != c2 && c2 != c3 && c1 != c3);

        uint8[3] memory cards = [c1, c2, c3];
        uint8 rank = game.exposeEvaluateHand(cards);
        assertTrue(rank <= 5, "Hand rank must be 0-5");
    }

    /// @notice A hand with a strictly higher rank always has a higher score
    function testFuzz_higherRankMeansHigherScore(
        uint8 c1, uint8 c2, uint8 c3,
        uint8 c4, uint8 c5, uint8 c6
    ) public {
        c1 = uint8(bound(uint256(c1), 1, 52));
        c2 = uint8(bound(uint256(c2), 1, 52));
        c3 = uint8(bound(uint256(c3), 1, 52));
        c4 = uint8(bound(uint256(c4), 1, 52));
        c5 = uint8(bound(uint256(c5), 1, 52));
        c6 = uint8(bound(uint256(c6), 1, 52));
        vm.assume(c1 != c2 && c1 != c3 && c2 != c3);
        vm.assume(c4 != c5 && c4 != c6 && c5 != c6);

        uint8[3] memory hand1 = [c1, c2, c3];
        uint8[3] memory hand2 = [c4, c5, c6];

        uint8 rank1 = game.exposeEvaluateHand(hand1);
        uint8 rank2 = game.exposeEvaluateHand(hand2);
        uint32 score1 = game.exposeCalculateScore(hand1);
        uint32 score2 = game.exposeCalculateScore(hand2);

        if (rank1 > rank2) {
            assertGt(score1, score2, "Higher rank must yield higher score");
        }
    }
}
