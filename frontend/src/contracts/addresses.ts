import type { Address } from 'viem'

export const SEPOLIA_CHAIN_ID = 11155111

// Contract addresses - Update after deployment
export const GAME_CORE_ADDRESS = '0x0000000000000000000000000000000000000000' as Address
export const MOCK_ERC20_ADDRESS = '0x0000000000000000000000000000000000000000' as Address
export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000' as Address

// Chainlink VRF Coordinator (Sepolia)
export const VRF_COORDINATOR_ADDRESS = '0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625' as Address

// Auto-detect mock mode
export const USE_MOCK_CONTRACTS = GAME_CORE_ADDRESS === ETH_ADDRESS
