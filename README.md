# On-Chain Verifiable Random Game Platform

A decentralized gaming platform deployed on Ethereum Sepolia testnet, featuring provably fair games powered by Chainlink VRF v2, NFT achievements, referral rewards, and ENS integration.

## Features

- **Dice Game** — Choose a multiplier (2x/5x/10x) and roll. Higher multipliers = bigger payouts but lower win chance.
- **3-Card Poker** — Classic 3-card poker against a dealer. Straight Flush > 3-of-a-Kind > Straight > Flush > Pair > High Card.
- **Chainlink VRF v2.5** — Provably fair on-chain randomness for every game result (supports Native ETH payment).
- **NFT Achievements** — ERC-721 tokens auto-minted on first dice/poker participation.
- **Referral System** — 1% commission on referred users' bets, claimable on-chain.
- **ENS Integration** — Player ENS names resolved from mainnet and displayed across the platform.
- **Multi-Token Support** — Bet with ETH or whitelisted ERC-20 tokens.

## Project Structure

```
├── README.md                   Comprehensive overview (this file)
├── ONCHAIN_GAME_DEV.md         Original specification & ABI reference
├── IMPLEMENTATION_PLAN.md      Detailed implementation plan
├── contracts/                  Solidity smart contracts (Foundry project)
│   ├── src/
│   │   ├── GameCore.sol        Main game contract (VRF, NFT, referral)
│   │   └── MockERC20.sol       Test ERC-20 token
│   ├── script/                 Deployment and interaction scripts
│   └── test/                   Foundry test cases
├── frontend/                   React + Vite + TypeScript application
│   ├── src/
│   │   ├── app/                App entry, routing, layout
│   │   ├── components/         Reusable UI components
│   │   ├── contracts/          ABI, types, viem clients
│   │   ├── hooks/              React hooks (wallet, ENS, events)
│   │   ├── mocks/              Mock contract client for dev
│   │   ├── pages/              Route pages (Home, Dice, Poker, Profile)
│   │   ├── stores/             Zustand state management
│   │   └── utils/              Formatting & helpers
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── docs/                       Additional documentation
│   ├── architecture.md         System architecture & design decisions
│   ├── security-analysis.md    Security considerations
│   └── gas-optimization.md     Gas optimization strategies
├── scripts/                    Deployment scripts & utilities
└── package.json                Root monorepo scripts
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, TypeScript, Tailwind CSS 4 |
| Blockchain Library | viem |
| State Management | Zustand |
| Routing | React Router v7 |
| Smart Contracts | Solidity ^0.8.20, OpenZeppelin, Chainlink VRF v2.5 |
| Network | Ethereum Sepolia Testnet |
| Development Framework | Foundry |

## Quick Start

### Prerequisites

- Node.js >= 18
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (for contract development)
- MetaMask browser extension
- Sepolia ETH from [faucet](https://sepoliafaucet.com)

### Run Frontend (Dev Mode)

```bash
# Install dependencies
cd frontend
npm install

# Start dev server
npm run dev
# → http://localhost:5173
```

### Build for Production

```bash
cd frontend
npm run build
```

### Deploy Contracts (Foundry)

1. **Install Dependencies**:
   ```bash
   cd contracts
   forge install
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env` and fill in the values:
   ```env
   PRIVATE_KEY=your_private_key
   ETH_RPC_URL=https://ethereum-sepolia.publicnode.com
   VRF_SUBSCRIPTION_ID=your_sub_id
   ...
   ```

3. **Deploy GameCore**:
   ```bash
   # Load environment variables
   # (Foundry automatically loads .env files, compatible with Windows/Linux/Mac)
   # Linux/Mac users can optionally run 'source .env' first.
   forge script script/DeployGameCore.s.sol:DeployGameCore --broadcast
   ```
   *Copy the deployed GameCore address from the output.*

4. **Fund Reward Pool**:
   - Add the new address to `.env`:
     ```env
     GAME_CORE_ADDRESS=0x...
     ```
   - Run the funding script:
     ```bash
     forge script script/FundRewardPool.s.sol:FundRewardPool --broadcast
     ```

5. **Post-Deployment**:
   - Add the deployed GameCore address as a **Consumer** in your Chainlink VRF Subscription.
   - Update `frontend/src/contracts/addresses.ts` with the new address.

## Game Mechanics

### Dice Game

| Multiplier | Win Condition | Win Probability | Payout (after 2% edge) |
|-----------|---------------|-----------------|------------------------|
| 2x | Roll > 50 | 50% | 1.96x |
| 5x | Roll > 80 | 20% | 4.90x |
| 10x | Roll > 90 | 10% | 9.80x |

### 3-Card Poker

- 3 cards dealt to player and dealer via Chainlink VRF.
- **Hand Ranking**: Straight Flush > Three of a Kind > Straight > Flush > Pair > High Card.
- **Tie Breaker**:
  - Pair vs Pair: Compare pair rank first, then kicker.
  - High Card vs High Card: Compare High, then Mid, then Low card.
- **Payouts**:
  - Win: 2x payout (1.96x after house edge).
  - Tie: Full refund.

## Contract Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| GameCore | `0x91acbb64811665ed40114c21292FAEA48602705E` |
| MockERC20 | *Optional / TBD* |
| VRF Coordinator | `0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625` |

## License

MIT
