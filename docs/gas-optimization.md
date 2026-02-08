# Gas Optimization

## Current Gas Estimates

| Function | Estimated Gas | Notes |
|----------|-------------|-------|
| `betDice()` | ~150,000 | Includes VRF request + storage write + achievement check |
| `betPoker()` | ~150,000 | Similar to betDice |
| `fulfillRandomWords()` (dice) | ~80,000 | Settlement + payout transfer |
| `fulfillRandomWords()` (poker) | ~120,000 | Settlement + hand evaluation + payout |
| `setReferrer()` | ~45,000 | Single storage write |
| `claimReferralRewards()` | ~60,000+ | Iterates supported tokens |
| `addSupportedToken()` | ~50,000 | Array push + mapping write |

## Optimization Strategies Applied

### 1. Storage Packing

Structs are designed to minimize storage slots:

```solidity
struct DiceBet {
    address player;      // 20 bytes ─┐
    uint8 chosenNumber;  //  1 byte   │ slot 1 (packed)
    uint8 multiplier;    //  1 byte   │
    bool settled;        //  1 byte  ─┘
    uint8 result;        //  1 byte  ─── slot 2
    address token;       // 20 bytes ─── slot 3
    uint256 amount;      // 32 bytes ─── slot 4
    uint256 payout;      // 32 bytes ─── slot 5
}
```

### 2. Minimal VRF Callback

The `fulfillRandomWords()` callback is kept lean to stay within `callbackGasLimit`:
- Single random word requested (`numWords = 1`)
- Poker card generation uses `keccak256` chaining from one seed instead of requesting 6 random words
- Hand evaluation uses simple comparisons (no sorting algorithm in hot path)

### 3. Achievement Check Optimization

```solidity
// One-time check with boolean mapping — O(1)
if (!hasDiceAchievement[msg.sender]) {
    hasDiceAchievement[msg.sender] = true;
    _safeMint(msg.sender, nextTokenId);
    nextTokenId++;
}
```

After first bet, the achievement check costs only ~2,100 gas (cold SLOAD).

### 4. Referral Processing

```solidity
// Simple percentage calculation — no loops
uint256 reward = (amount * 100) / 10000;  // 1%
referralRewards[referrer][token] += reward;
```

Rewards accumulate in a mapping rather than sending immediately, avoiding per-bet external calls.

### 5. Single Random Word

Instead of requesting multiple VRF random words (which increases cost linearly), we request one and derive additional randomness via `keccak256`:

```solidity
// One VRF request → 6 derived card values
uint256 seed = randomWord;
for (uint8 i = 0; i < 6; i++) {
    cards[i] = uint8((seed % 13) + 1);
    seed = uint256(keccak256(abi.encode(seed)));
}
```

`keccak256` is cheap (~30 gas) compared to additional VRF words (~20,000 gas each).

## Further Optimization Opportunities

### Short-Term

1. **Use `uint96` for amounts**: ERC-20 amounts rarely exceed `uint96` (~79B tokens), saving a storage slot when packed with addresses.

2. **Event-only history**: Remove `playerTotalBets`/`playerWins`/`playerTotalPayout` storage and compute stats from events client-side. Saves ~20,000 gas per bet (3 SSTORE operations).

3. **Batch token claims**: `claimReferralRewards()` iterates all supported tokens. An alternative accepting a specific token address would save gas when only one token has rewards.

### Long-Term

4. **EIP-2929 warm storage**: Group related storage reads (bet struct fields) in the same transaction context to benefit from warm access (~100 gas vs 2,100 gas cold).

5. **Assembly for hand evaluation**: Replace Solidity sorting with inline assembly for the 3-element sort. Estimated saving: ~200 gas per poker settlement.

6. **Upgradeable proxy (UUPS)**: If expecting contract changes, deploy behind a proxy to avoid redeployment costs. Trade-off: ~2,400 gas overhead per call.

## VRF Cost Considerations

| Parameter | Value | Impact |
|-----------|-------|--------|
| `callbackGasLimit` | 200,000 | Higher limit = more LINK consumed per request |
| `requestConfirmations` | 3 | More confirmations = slower but more secure |
| `numWords` | 1 | Each additional word costs ~20,000 gas |
| Key hash | 500 gwei | Gas lane selection — lower lanes are cheaper but slower |

**LINK cost per VRF request** (Sepolia): ~0.25 LINK at 500 gwei gas lane.

Ensure VRF subscription is funded with sufficient LINK for expected bet volume.
