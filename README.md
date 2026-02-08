# On-Chain Verifiable Random Game Platform

A decentralized gaming platform deployed on Ethereum Sepolia testnet, featuring provably fair games powered by Chainlink VRF v2, NFT achievements, referral rewards, and ENS integration.

## Features

- **Dice Game** — Choose a multiplier (2x/5x/10x) and roll. Higher multipliers = bigger payouts but lower win chance.
- **Simplified Poker** — 3-card poker against a dealer. Three of a Kind > Pair > High Card.
- **Chainlink VRF v2** — Provably fair on-chain randomness for every game result.
- **NFT Achievements** — ERC-721 tokens auto-minted on first dice/poker participation.
- **Referral System** — 1% commission on referred users' bets, claimable on-chain.
- **ENS Integration** — Player ENS names resolved from mainnet and displayed across the platform.
- **Multi-Token Support** — Bet with ETH or whitelisted ERC-20 tokens.

## Project Structure

```
├── README.md                   Comprehensive overview (this file)
├── ONCHAIN_GAME_DEV.md         Original specification & ABI reference
├── IMPLEMENTATION_PLAN.md      Detailed implementation plan
├── contracts/                  Solidity smart contracts
│   ├── src/
│   │   ├── GameCore.sol        Main game contract (VRF, NFT, referral)
│   │   └── MockERC20.sol       Test ERC-20 token
│   └── test/                   Contract test cases
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
| Smart Contracts | Solidity ^0.8.20, OpenZeppelin, Chainlink VRF v2 |
| Network | Ethereum Sepolia Testnet |
| Contract IDE | Remix |

## Quick Start

### Prerequisites

- Node.js >= 18
- MetaMask browser extension
- Sepolia ETH from [faucet](https://sepoliafaucet.com)

### Run Frontend (Mock Mode)

```bash
# Install dependencies
npm run install:frontend

# Start dev server (uses mock contracts, no MetaMask needed)
npm run dev
# → http://localhost:5173
```

### Build for Production

```bash
npm run build
```

### Deploy Contracts (Remix)

1. Open [Remix IDE](https://remix.ethereum.org)
2. Copy `contracts/src/GameCore.sol` and `contracts/src/MockERC20.sol`
3. Compile with Solidity ^0.8.20
4. Deploy MockERC20 first
5. Deploy GameCore with constructor args:
   - `vrfCoordinator`: `0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625`
   - `subscriptionId`: Your VRF subscription ID from [vrf.chain.link](https://vrf.chain.link)
   - `keyHash`: `0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c`
6. Add GameCore as VRF consumer in your subscription
7. Fund reward pool: `fundRewardPool{value: 10 ether}()`
8. Add MockERC20: `addSupportedToken(mockERC20Address)`
9. Update `frontend/src/contracts/addresses.ts` with deployed addresses

## Game Mechanics

### Dice Game

| Multiplier | Win Condition | Win Probability | Payout (after 2% edge) |
|-----------|---------------|-----------------|------------------------|
| 2x | Roll > 50 | 50% | 1.96x |
| 5x | Roll > 80 | 20% | 4.90x |
| 10x | Roll > 90 | 10% | 9.80x |

### Simplified Poker

- 3 cards dealt to player and dealer via Chainlink VRF
- Hand ranking: Three of a Kind > Pair > High Card
- Win = 2x payout (1.96x after house edge), Tie = full refund

## Contract Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| GameCore | `TBD` — deploy and update |
| MockERC20 | `TBD` — deploy and update |
| VRF Coordinator | `0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625` |

## License

MIT
