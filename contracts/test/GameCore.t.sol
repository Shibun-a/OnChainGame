// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/GameCore.sol";
import "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";

contract GameCoreTest is Test {
    GameCore public game;
    VRFCoordinatorV2_5Mock public vrfCoordinator;

    uint256 public subscriptionId;
    bytes32 public keyHash = 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c; // Sepolia keyHash (mock)

    address public player = address(0x123);

    event DiceBetPlaced(uint256 indexed requestId, address indexed player, uint256 amount, address token, uint8 chosenNumber, uint8 multiplier);
    event DiceBetSettled(uint256 indexed requestId, uint8 result, uint256 payout, bool win);

    function setUp() public {
        // Deploy VRF Coordinator Mock
        // baseFee: 0.1 LINK, gasPriceLink: 1e9, weiPerUnitLink: 4e15 (approx)
        vrfCoordinator = new VRFCoordinatorV2_5Mock(0.1 ether, 1e9, 4e15);

        // Create Subscription
        subscriptionId = vrfCoordinator.createSubscription();
        vrfCoordinator.fundSubscription(subscriptionId, 100 ether);
        vrfCoordinator.fundSubscriptionWithNative{value: 100 ether}(subscriptionId);
        
        // Deploy GameCore
        game = new GameCore(
            address(vrfCoordinator),
            subscriptionId,
            keyHash
        );

        // Add GameCore as consumer to subscription
        vrfCoordinator.addConsumer(subscriptionId, address(game));

        // Fund GameCore with ETH for payouts
        vm.deal(address(this), 20 ether);
        game.fundRewardPool{value: 10 ether}();

        // Fund player
        vm.deal(player, 10 ether);
    }

    function testBetDice() public {
        vm.startPrank(player);

        uint256 betAmount = 0.01 ether;
        uint8 chosenNumber = 50;
        uint8 multiplier = 2; // 2x multiplier, win if roll > 50

        // 1. Place Bet
        // Expect DiceBetPlaced event
        // Note: RequestId is hard to predict in mock without checking logs, but it starts at 1 usually.
        vm.expectEmit(true, true, false, true);
        emit DiceBetPlaced(1, player, betAmount, address(0), chosenNumber, multiplier);

        uint256 requestId = game.betDice{value: betAmount}(chosenNumber, multiplier, address(0), betAmount);
        
        vm.stopPrank();

        // Check if bet is recorded
        (uint8 result, uint256 payout, bool win) = game.getDiceResult(requestId);
        assertEq(result, 0); // Not settled yet
        assertEq(payout, 0);
        assertEq(win, false);

        // 2. Fulfill Randomness (Simulate Chainlink Node)
        // We need to fulfill with a random word.
        // Let's say random word results in a win.
        // Logic: (randomWord % 100) + 1. 
        // If we want result > 50 (e.g. 51), we need randomWord % 100 == 50.
        // So randomWord = 50 works.
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 50; 

        // Expect DiceBetSettled event
        // result = 50 + 1 = 51.
        // Win condition: 51 > 50 (True for multiplier 2)
        // Payout = 0.01 * 2 * (10000 - 200) / 10000 = 0.01 * 2 * 0.98 = 0.0196
        uint256 expectedPayout = (betAmount * multiplier * (10000 - 200)) / 10000;

        vm.expectEmit(true, false, false, true);
        emit DiceBetSettled(requestId, 51, expectedPayout, true);

        vrfCoordinator.fulfillRandomWordsWithOverride(requestId, address(game), randomWords);

        // 3. Verify Result
        (result, payout, win) = game.getDiceResult(requestId);
        assertEq(result, 51);
        assertEq(payout, expectedPayout);
        assertEq(win, true);

        // Check player balance increased
        // Initial: 10 - 0.01 = 9.99
        // Final: 9.99 + 0.0196 = 10.0096
        assertEq(player.balance, 10 ether - betAmount + expectedPayout);
    }
}
