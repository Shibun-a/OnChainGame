# System Architecture

## Overview

The platform follows a **frontend-first, contract-decoupled** architecture where the React frontend communicates directly with Ethereum smart contracts via viem. No backend server is required — all game logic, randomness, and settlements happen on-chain.

```
┌─────────────────────────────────────────────────┐
│                   User Browser                   │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  React   │  │  Zustand  │  │  viem Client  │  │
│  │  Pages   │──│  Stores   │──│  (read/write) │  │
│  └──────────┘  └──────────┘  └──────┬───────┘  │
│                                      │          │
│  ┌──────────────────────────────────┐│          │
│  │  MetaMask (window.ethereum)      ││          │
│  └──────────────────────────────────┘│          │
└──────────────────────────────────────┼──────────┘
                                       │
              ┌────────────────────────┼──────────┐
              │      Sepolia Testnet   │          │
              │                        ▼          │
              │  ┌─────────────────────────────┐  │
              │  │       GameCore.sol           │  │
              │  │  ┌───────┐ ┌──────────────┐ │  │
              │  │  │ Dice  │ │   Poker      │ │  │
              │  │  └───┬───┘ └──────┬───────┘ │  │
              │  │      │            │         │  │
              │  │  ┌───▼────────────▼───────┐ │  │
              │  │  │   Chainlink VRF v2     │ │  │
              │  │  │  (random callback)     │ │  │
              │  │  └────────────────────────┘ │  │
              │  │  ┌────────────┐ ┌─────────┐ │  │
              │  │  │ ERC-721    │ │Referral │ │  │
              │  │  │ Achievement│ │ System  │ │  │
              │  │  └────────────┘ └─────────┘ │  │
              │  └─────────────────────────────┘  │
              │                                   │
              │  ┌──────────────┐                  │
              │  │ Ethereum     │ (ENS resolve)    │
              │  │ Mainnet      │                  │
              │  └──────────────┘                  │
              └───────────────────────────────────┘
```

## Design Decisions

### 1. No Backend Required

All game state lives on-chain. The frontend reads contract state and listens for events. This eliminates server costs and trust assumptions.

### 2. Single Contract (GameCore.sol)

Both games, achievements, and referrals are in one contract to:
- Reduce deployment complexity
- Share state (player stats, reward pool)
- Simplify VRF callback routing

### 3. viem Over ethers.js

- Smaller bundle size
- First-class TypeScript support
- Better tree-shaking
- Modern API design

### 4. Mock Contract Client

A `mockContractClient` mirrors the real contract interface, enabling frontend development without deployed contracts. Switching is automatic based on whether `GAME_CORE_ADDRESS` is set.

### 5. ENS via Mainnet Client

ENS names are only registered on Ethereum mainnet. We use a separate `mainnetClient` for ENS resolution, with 24-hour localStorage caching to reduce RPC calls.

## Data Flow

### Placing a Bet

```
User clicks "Roll Dice"
  → BetForm validates input
  → gameStore.placeDiceBet()
  → contractClient.betDice()
    [mock] → setTimeout 3-5s → settleDice() → emit event
    [real] → MetaMask tx → VRF request → VRF callback → emit event
  → useContractEvents listens for DiceBetSettled
  → gameStore.updateDiceResult()
  → ResultPanel re-renders with result
```

### Wallet Connection

```
User clicks "Connect Wallet"
  → walletStore.connect()
  → window.ethereum.request('eth_requestAccounts')
  → Store address + chainId
  → Listen accountsChanged / chainChanged
  → Auto-reconnect on page refresh (localStorage flag)
```

## State Architecture (Zustand)

| Store | Responsibility |
|-------|---------------|
| `walletStore` | Wallet connection, balances, network |
| `gameStore` | Game config, active/historical bets, pending VRF requests |
| `achievementStore` | NFT achievement status |
| `referralStore` | Referrer info, accumulated rewards |

All stores integrate with `contractClient` which auto-switches between mock and real implementations.
