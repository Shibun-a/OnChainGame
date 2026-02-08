# Security Analysis

## Smart Contract Security

### 1. Reentrancy Protection

**Risk**: External calls (ETH transfers, ERC-20 transfers) could enable reentrancy attacks.

**Mitigation**: All state-changing functions that perform external calls use OpenZeppelin's `ReentrancyGuard` via the `nonReentrant` modifier:
- `betDice()` — nonReentrant
- `betPoker()` — nonReentrant
- `claimReferralRewards()` — nonReentrant

The VRF callback (`fulfillRandomWords`) is internal and called by the VRF Coordinator, reducing reentrancy surface.

### 2. Randomness Integrity

**Risk**: Miners or validators could manipulate randomness.

**Mitigation**: Chainlink VRF v2 provides cryptographically verifiable randomness:
- Random values are generated off-chain by Chainlink nodes
- On-chain verification ensures values cannot be tampered with
- Neither the contract owner nor miners can predict or influence results
- No commit-reveal needed — VRF provides sufficient guarantees for MVP

**Limitation**: VRF requests take 30-60 seconds on Sepolia (2-3 block confirmations). This is inherent to the VRF design and communicated to users via UI.

### 3. Reward Pool Solvency

**Risk**: Contract cannot pay out large wins if reward pool is depleted.

**Mitigation**:
- `betDice()` and `betPoker()` check `rewardPool >= maxPayout` before accepting bets
- Maximum potential payout is calculated upfront: `amount * multiplier * (10000 - houseEdge) / 10000`
- Bets are rejected if the pool cannot cover the worst-case payout
- Owner can top up via `fundRewardPool()` or the `receive()` fallback

### 4. Integer Overflow / Underflow

**Risk**: Arithmetic operations could overflow.

**Mitigation**: Solidity ^0.8.20 has built-in overflow/underflow checks. All arithmetic operations will revert on overflow.

### 5. Access Control

**Risk**: Unauthorized users modifying game parameters.

**Mitigation**: OpenZeppelin `Ownable` restricts admin functions:
- `addSupportedToken()` — onlyOwner
- `fundRewardPool()` — onlyOwner
- `setGameConfig()` — onlyOwner

### 6. ERC-20 Token Handling

**Risk**: Malicious tokens, fee-on-transfer tokens, or failed transfers.

**Mitigation**:
- Only whitelisted tokens via `isTokenSupported` mapping
- `transferFrom()` return value checked with `require()`
- Token whitelist controlled by contract owner

**Known Limitation**: Fee-on-transfer tokens would cause accounting mismatch. Only standard ERC-20 tokens should be whitelisted.

### 7. Referral System Abuse

**Risk**: Self-referral, circular referrals, or referral reward draining.

**Mitigation**:
- `setReferrer()` checks `referrer != msg.sender`
- Referrer can only be set once (immutable after first set)
- Referral rewards accumulate in contract, not sent immediately
- `claimReferralRewards()` protected by `nonReentrant`

## Frontend Security

### 1. Private Key Safety

- No private keys stored in frontend
- All transactions signed via MetaMask (user approval required)
- No server-side key management

### 2. RPC Endpoint Security

- Default public RPC endpoints used for Sepolia
- For production, use authenticated endpoints (Alchemy/Infura) to prevent rate limiting
- ENS resolution uses mainnet public RPC with localStorage caching (24h TTL)

### 3. Input Validation

- Bet amounts validated against `minBet`/`maxBet` before transaction
- Address inputs validated with regex pattern
- All user inputs sanitized before contract calls

### 4. Event Tampering

- In mock mode, events are dispatched via `CustomEvent` (client-side only)
- In production mode, events come from on-chain logs verified by the RPC provider
- Frontend reads are view-only and cannot modify contract state

## Known Limitations & Risks

| Risk | Severity | Status |
|------|----------|--------|
| VRF callback gas limit may be insufficient for complex settlements | Medium | `callbackGasLimit` set to 200000, adjustable by owner |
| Missed settlement events if user navigates away | Low | Pending bets stored in localStorage, re-checked on load |
| Public RPC rate limiting | Low | Cache ENS results, consider authenticated RPC for production |
| No formal audit | High | Recommended before mainnet deployment |
| Single-owner admin control | Medium | Consider multi-sig or timelock for production |

## Recommendations for Production

1. **Formal Audit**: Get professional audit before mainnet deployment
2. **Multi-sig Ownership**: Transfer ownership to a Gnosis Safe
3. **Timelock**: Add timelock to admin functions (game config changes)
4. **Rate Limiting**: Consider per-address bet frequency limits
5. **Emergency Pause**: Add `Pausable` modifier for emergency stops
6. **Authenticated RPC**: Use Alchemy/Infura with API keys
