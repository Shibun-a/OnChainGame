// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

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
    ) VRFConsumerBaseV2Plus(_vrfCoordinator) ERC721("GameAchievements", "GACH") {
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
                // Convert 0-51 to 1-13 Rank
                cards[count] = (card % 13) + 1;
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
        uint8[3] memory s = _sort(cards);
        if (s[0] == s[1] && s[1] == s[2]) return 2; // Three of a kind
        if (s[0] == s[1] || s[1] == s[2]) return 1; // Pair
        return 0; // High card
    }

    function _calculateScore(uint8[3] memory cards) internal pure returns (uint32) {
        uint8[3] memory s = _sort(cards);
        
        // Three of a Kind: Base 300000 + Rank
        if (s[0] == s[1] && s[1] == s[2]) {
            return 300000 + uint32(s[0]);
        }
        
        // Pair: Base 200000 + PairRank*100 + Kicker
        if (s[0] == s[1]) { // Pair is s[0], Kicker is s[2]
            return 200000 + uint32(s[0]) * 100 + uint32(s[2]);
        }
        if (s[1] == s[2]) { // Pair is s[1], Kicker is s[0]
            return 200000 + uint32(s[1]) * 100 + uint32(s[0]);
        }
        
        // High Card: Base 100000 + High*10000 + Mid*100 + Low
        // Note: s[2] is highest, s[0] is lowest based on _sort
        return 100000 + uint32(s[2]) * 10000 + uint32(s[1]) * 100 + uint32(s[0]);
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
