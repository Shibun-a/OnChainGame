# Deployment Guide

## Contract Deployment (Remix IDE)

### Step 1: Prerequisites

1. Get Sepolia ETH: https://sepoliafaucet.com
2. Get Sepolia LINK: https://faucets.chain.link/sepolia
3. Create VRF v2 subscription: https://vrf.chain.link
   - Connect wallet → Select Sepolia → Create Subscription
   - Fund with 5+ LINK tokens
   - Note your Subscription ID

### Step 2: Deploy MockERC20

1. Open https://remix.ethereum.org
2. Create `MockERC20.sol`, paste from `contracts/src/MockERC20.sol`
3. Compiler: 0.8.20, EVM: default
4. Deploy → No constructor args
5. Save deployed address as `MOCK_ERC20_ADDRESS`

### Step 3: Deploy GameCore

1. Create `GameCore.sol`, paste from `contracts/src/GameCore.sol`
2. Constructor args:
   - `_vrfCoordinator`: `0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625`
   - `_subscriptionId`: (your subscription ID)
   - `_keyHash`: `0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c`
3. Deploy → Save address as `GAME_CORE_ADDRESS`

### Step 4: Configure

```
addSupportedToken(MOCK_ERC20_ADDRESS)
fundRewardPool{value: 10000000000000000000}()    // 10 ETH
```

### Step 5: VRF Consumer

1. Go to https://vrf.chain.link → Your subscription
2. Add Consumer → Enter `GAME_CORE_ADDRESS`
3. Confirm transaction

### Step 6: Update Frontend

Edit `frontend/src/contracts/addresses.ts`:
```ts
export const GAME_CORE_ADDRESS = '0x...' as Address   // your GameCore address
export const MOCK_ERC20_ADDRESS = '0x...' as Address   // your MockERC20 address
```

### Step 7: Build & Deploy Frontend

```bash
cd frontend
npm run build
npx vercel --prod
```
