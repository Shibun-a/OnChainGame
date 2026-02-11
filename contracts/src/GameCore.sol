// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract GameCore is VRFConsumerBaseV2Plus, ERC721, ReentrancyGuard {

    // ============ State Variables ============

    // Game config
    uint256 public houseEdgeBps = 200; // 2%
    uint256 public minBet = 0.001 ether;
    uint256 public maxBet = 1 ether;
    uint256 public rewardPool;

    // VRF config
    uint256 public subscriptionId;
    bytes32 public keyHash;
    uint32 public callbackGasLimit = 500000;
    uint16 public requestConfirmations = 3;

    // Token whitelist
    address[] public supportedTokens;
    mapping(address => bool) public isTokenSupported;

    // Bet structures
    struct DiceBet {
        address player;
        uint256 amount;
        address token;
        uint8 chosenNumber;
        uint8 multiplier;
        bool settled;
        uint8 result;
        uint256 payout;
    }

    struct PokerBet {
        address player;
        uint256 amount;
        address token;
        bool settled;
        uint8[3] playerCards;
        uint8[3] dealerCards;
        uint8 playerHandRank;
        uint8 dealerHandRank;
        uint256 payout;
    }

    mapping(uint256 => DiceBet) public diceBets;
    mapping(uint256 => PokerBet) public pokerBets;
    mapping(uint256 => bool) public isDiceRequest;

    // Referral system
    mapping(address => address) public referrers;
    mapping(address => mapping(address => uint256)) public referralRewards;

    // Achievements (NFT)
    uint256 private nextTokenId = 1;
    mapping(address => bool) public hasDiceAchievement;
    mapping(address => bool) public hasPokerAchievement;

    // Player stats
    mapping(address => uint256) public playerTotalBets;
    mapping(address => uint256) public playerWins;
    mapping(address => uint256) public playerTotalPayout;

    // ============ Events ============

    event DiceBetPlaced(uint256 indexed requestId, address indexed player, uint256 amount, address token, uint8 chosenNumber, uint8 multiplier);
    event DiceBetSettled(uint256 indexed requestId, uint8 result, uint256 payout, bool win);
    event PokerBetPlaced(uint256 indexed requestId, address indexed player, uint256 amount, address token, uint8 handChoice);
    event PokerBetSettled(uint256 indexed requestId, uint8 playerHand, uint8 dealerHand, uint256 payout, bool win);
    event AchievementMinted(address indexed player, uint256 achievementId, uint256 tokenId);
    event ReferralRewardPaid(address indexed player, uint256 amount, address token);

    // ============ Constructor ============

    constructor(
        address _vrfCoordinator,
        uint256 _subscriptionId,
        bytes32 _keyHash
    ) 
        VRFConsumerBaseV2Plus(_vrfCoordinator) 
        ERC721("GameAchievements", "GACH") 
    {
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;

        // ETH as default supported token (zero address)
        supportedTokens.push(address(0));
        isTokenSupported[address(0)] = true;
    }

    // Allow receiving ETH to fund the reward pool
    receive() external payable {
        rewardPool += msg.value;
    }
        // ============ Admin Functions ============

    function addSupportedToken(address token) external onlyOwner {
        require(!isTokenSupported[token], "Already supported");
        supportedTokens.push(token);
        isTokenSupported[token] = true;
    }

    function fundRewardPool() external payable onlyOwner {
        rewardPool += msg.value;
    }

    function setGameConfig(uint256 _houseEdgeBps, uint256 _minBet, uint256 _maxBet) external onlyOwner {
        houseEdgeBps = _houseEdgeBps;
        minBet = _minBet;
        maxBet = _maxBet;
    }

    // ============ View Functions ============

    function getGameConfig() external view returns (uint256, uint256, uint256, uint256) {
        return (houseEdgeBps, minBet, maxBet, rewardPool);
    }

    function getPlayerStats(address player) external view returns (uint256, uint256, uint256, address) {
        return (playerTotalBets[player], playerWins[player], playerTotalPayout[player], referrers[player]);
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokens;
    }

    function getTokenInfo(address token) external view returns (string memory symbol, uint8 decimals, bool enabled) {
        if (token == address(0)) {
            return ("ETH", 18, true);
        }
        return ("MOCK", 18, isTokenSupported[token]);
    }

    function getDiceResult(uint256 requestId) external view returns (uint8 result, uint256 payout, bool win) {
        DiceBet memory bet = diceBets[requestId];
        require(bet.player != address(0), "Bet not found");
        return (bet.result, bet.payout, bet.payout > 0);
    }

    function getPokerResult(uint256 requestId) external view returns (uint8 playerHand, uint8 dealerHand, uint256 payout, bool win) {
        PokerBet memory bet = pokerBets[requestId];
        require(bet.player != address(0), "Bet not found");
        return (bet.playerHandRank, bet.dealerHandRank, bet.payout, bet.payout > 0);
    }

    function getFullPokerBet(uint256 requestId) external view returns (PokerBet memory) {
        return pokerBets[requestId];
    }

    function getAchievements(address player) external view returns (uint256[] memory) {
        uint256 count = 0;
        if (hasDiceAchievement[player]) count++;
        if (hasPokerAchievement[player]) count++;

        uint256[] memory ids = new uint256[](count);
        uint256 idx = 0;
        if (hasDiceAchievement[player]) { ids[idx] = 1; idx++; }
        if (hasPokerAchievement[player]) { ids[idx] = 2; }
        return ids;
    }

    // ============ Dice Game ============

    function betDice(
        uint8 chosenNumber,
        uint8 multiplier,
        address token,
        uint256 amount
    ) external payable nonReentrant returns (uint256 requestId) {
        require(amount >= minBet && amount <= maxBet, "Bet out of range");
        require(isTokenSupported[token], "Token not supported");
        require(multiplier == 2 || multiplier == 5 || multiplier == 10, "Invalid multiplier");

        // Handle payment
        if (token == address(0)) {
            require(msg.value == amount, "Incorrect ETH amount");
        } else {
            require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        }

        // Check reward pool
        uint256 maxPayout = (amount * multiplier * (10000 - houseEdgeBps)) / 10000;
        require(rewardPool >= maxPayout, "Reward pool insufficient");

        // Request VRF
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: 1,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: true})
                )
            })
        );

        // Store bet
        diceBets[requestId] = DiceBet({
            player: msg.sender,
            amount: amount,
            token: token,
            chosenNumber: chosenNumber,
            multiplier: multiplier,
            settled: false,
            result: 0,
            payout: 0
        });
        isDiceRequest[requestId] = true;

        // Update stats
        playerTotalBets[msg.sender]++;

        // Mint achievement if first dice bet
        if (!hasDiceAchievement[msg.sender]) {
            hasDiceAchievement[msg.sender] = true;
            _safeMint(msg.sender, nextTokenId);
            emit AchievementMinted(msg.sender, 1, nextTokenId);
            nextTokenId++;
        }

        // Process referral
        _processReferral(msg.sender, token, amount);

        emit DiceBetPlaced(requestId, msg.sender, amount, token, chosenNumber, multiplier);
    }

    // ============ Poker Game ============

    function betPoker(
        uint8 handChoice,
        address token,
        uint256 amount
    ) external payable nonReentrant returns (uint256 requestId) {
        require(amount >= minBet && amount <= maxBet, "Bet out of range");
        require(isTokenSupported[token], "Token not supported");

        if (token == address(0)) {
            require(msg.value == amount, "Incorrect ETH amount");
        } else {
            require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        }

        uint256 maxPayout = (amount * 2 * (10000 - houseEdgeBps)) / 10000;
        require(rewardPool >= maxPayout, "Reward pool insufficient");

        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: 1,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: true})
                )
            })
        );

        pokerBets[requestId] = PokerBet({
            player: msg.sender,
            amount: amount,
            token: token,
            settled: false,
            playerCards: [0, 0, 0],
            dealerCards: [0, 0, 0],
            playerHandRank: 0,
            dealerHandRank: 0,
            payout: 0
        });
        isDiceRequest[requestId] = false;

        playerTotalBets[msg.sender]++;

        if (!hasPokerAchievement[msg.sender]) {
            hasPokerAchievement[msg.sender] = true;
            _safeMint(msg.sender, nextTokenId);
            emit AchievementMinted(msg.sender, 2, nextTokenId);
            nextTokenId++;
        }

        _processReferral(msg.sender, token, amount);

        emit PokerBetPlaced(requestId, msg.sender, amount, token, handChoice);
    }

    // ============ VRF Callback ============

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        if (isDiceRequest[requestId]) {
            _settleDice(requestId, randomWords[0]);
        } else {
            _settlePoker(requestId, randomWords[0]);
        }
    }

    function _settleDice(uint256 requestId, uint256 randomWord) private {
        DiceBet storage bet = diceBets[requestId];
        require(!bet.settled, "Already settled");

        uint8 result = uint8((randomWord % 100) + 1);
        bet.result = result;

        uint8 threshold = bet.multiplier == 2 ? 50 : (bet.multiplier == 5 ? 80 : 90);
        bool win = result > threshold;

        if (win) {
            uint256 payout = (bet.amount * bet.multiplier * (10000 - houseEdgeBps)) / 10000;
            bet.payout = payout;
            rewardPool -= payout;
            playerWins[bet.player]++;
            playerTotalPayout[bet.player] += payout;

            if (bet.token == address(0)) {
                payable(bet.player).transfer(payout);
            } else {
                IERC20(bet.token).transfer(bet.player, payout);
            }
        }

        bet.settled = true;
        emit DiceBetSettled(requestId, result, bet.payout, win);
    }

    function _settlePoker(uint256 requestId, uint256 randomWord) private {
        PokerBet storage bet = pokerBets[requestId];
        require(!bet.settled, "Already settled");

        // Generate 6 unique cards from 52 card deck
        uint256 seed = randomWord;
        uint8[6] memory cards;
        uint8 count = 0;
        uint256 drawnMask = 0;

        while (count < 6) {
            uint8 card = uint8(seed % 52);
            // Check if card already drawn
            if ((drawnMask & (1 << card)) == 0) {
                drawnMask |= (1 << card);
                // Store 1-52 (Card ID)
                cards[count] = card + 1;
                count++;
            }
            seed = uint256(keccak256(abi.encode(seed)));
        }

        bet.playerCards = [cards[0], cards[1], cards[2]];
        bet.dealerCards = [cards[3], cards[4], cards[5]];

        bet.playerHandRank = _evaluateHand(bet.playerCards);
        bet.dealerHandRank = _evaluateHand(bet.dealerCards);

        // Calculate detailed scores for tie-breaking
        uint32 playerScore = _calculateScore(bet.playerCards);
        uint32 dealerScore = _calculateScore(bet.dealerCards);

        bool win = playerScore > dealerScore;
        bool tie = playerScore == dealerScore;

        if (win) {
            uint256 payout = (bet.amount * 2 * (10000 - houseEdgeBps)) / 10000;
            bet.payout = payout;
            rewardPool -= payout;
            playerWins[bet.player]++;
            playerTotalPayout[bet.player] += payout;
        } else if (tie) {
            bet.payout = bet.amount; // Return bet on tie
        }

        if (bet.payout > 0) {
            if (bet.token == address(0)) {
                payable(bet.player).transfer(bet.payout);
            } else {
                IERC20(bet.token).transfer(bet.player, bet.payout);
            }
        }

        bet.settled = true;
        emit PokerBetSettled(requestId, bet.playerHandRank, bet.dealerHandRank, bet.payout, win);
    }

    function _evaluateHand(uint8[3] memory cards) internal pure returns (uint8) {
        uint8[3] memory ranks;
        uint8[3] memory suits;
        
        for (uint i = 0; i < 3; i++) {
            ranks[i] = _getRank(cards[i]);
            suits[i] = _getSuit(cards[i]);
        }
        
        ranks = _sort(ranks);
        
        bool isFlush = (suits[0] == suits[1] && suits[1] == suits[2]);
        bool isStraight = (ranks[0] + 1 == ranks[1] && ranks[1] + 1 == ranks[2]);
        // A-2-3 Straight (A=14, 2=2, 3=3). Sorted: 2,3,14.
        if (ranks[0] == 2 && ranks[1] == 3 && ranks[2] == 14) isStraight = true;
        
        if (isFlush && isStraight) return 5; // Straight Flush
        if (ranks[0] == ranks[1] && ranks[1] == ranks[2]) return 4; // Three of a Kind
        if (isStraight) return 3; // Straight
        if (isFlush) return 2; // Flush
        if (ranks[0] == ranks[1] || ranks[1] == ranks[2]) return 1; // Pair
        return 0; // High Card
    }

    function _calculateScore(uint8[3] memory cards) internal pure returns (uint32) {
        uint8[3] memory ranks;
        for (uint i = 0; i < 3; i++) {
            ranks[i] = _getRank(cards[i]);
        }
        ranks = _sort(ranks);
        
        uint8 handRank = _evaluateHand(cards);
        
        // Base scores use 1,000,000 spacing to prevent overlap:
        // HC max = 14*10000+13*100+12 = 141,312 < 1,000,000 (PR base)
        // PR max = 1,000,000+14*100+14 = 1,001,414 < 2,000,000 (FL base)
        // FL max = 2,000,000+141,312 = 2,141,312 < 3,000,000 (ST base)
        uint32 base = uint32(handRank) * 1000000;
        
        if (handRank == 5) { // Straight Flush
            if (ranks[0] == 2 && ranks[1] == 3 && ranks[2] == 14) return base + 3; 
            return base + uint32(ranks[2]);
        }
        if (handRank == 4) { // Three of a Kind
            return base + uint32(ranks[0]);
        }
        if (handRank == 3) { // Straight
             if (ranks[0] == 2 && ranks[1] == 3 && ranks[2] == 14) return base + 3;
             return base + uint32(ranks[2]);
        }
        if (handRank == 2) { // Flush
            return base + uint32(ranks[2]) * 10000 + uint32(ranks[1]) * 100 + uint32(ranks[0]);
        }
        if (handRank == 1) { // Pair
            if (ranks[0] == ranks[1]) {
                return base + uint32(ranks[0]) * 100 + uint32(ranks[2]);
            } else {
                return base + uint32(ranks[1]) * 100 + uint32(ranks[0]);
            }
        }
        // High Card
        return uint32(ranks[2]) * 10000 + uint32(ranks[1]) * 100 + uint32(ranks[0]);
    }

    function _getRank(uint8 card) internal pure returns (uint8) {
        // card is 1-52
        // (card-1)%13 is 0-12 (A,2...K)
        uint8 r = (card - 1) % 13;
        if (r == 0) return 14; // Ace is 14
        return r + 1; // 2..13
    }

    function _getSuit(uint8 card) internal pure returns (uint8) {
        return (card - 1) / 13;
    }

    function _sort(uint8[3] memory arr) internal pure returns (uint8[3] memory) {
        if (arr[0] > arr[1]) (arr[0], arr[1]) = (arr[1], arr[0]);
        if (arr[1] > arr[2]) (arr[1], arr[2]) = (arr[2], arr[1]);
        if (arr[0] > arr[1]) (arr[0], arr[1]) = (arr[1], arr[0]);
        return arr;
    }

    // ============ Referral System ============

    function setReferrer(address referrer) external {
        require(referrers[msg.sender] == address(0), "Already set");
        require(referrer != msg.sender, "Cannot refer yourself");
        referrers[msg.sender] = referrer;
    }

    function _processReferral(address player, address token, uint256 amount) private {
        address referrer = referrers[player];
        if (referrer != address(0)) {
            uint256 reward = (amount * 100) / 10000; // 1%
            referralRewards[referrer][token] += reward;
        }
    }

    function claimReferralRewards() external nonReentrant {
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            uint256 reward = referralRewards[msg.sender][token];
            if (reward > 0) {
                referralRewards[msg.sender][token] = 0;
                if (token == address(0)) {
                    payable(msg.sender).transfer(reward);
                } else {
                    IERC20(token).transfer(msg.sender, reward);
                }
                emit ReferralRewardPaid(msg.sender, reward, token);
            }
        }
    }


}
