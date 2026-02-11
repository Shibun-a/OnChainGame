import type { Address } from 'viem'

export const SEPOLIA_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID) || 11155111

export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000' as Address

// Contract addresses - Update after deployment
export const GAME_CORE_ADDRESS = (import.meta.env.VITE_GAME_CORE_ADDRESS || ETH_ADDRESS) as Address
export const MOCK_ERC20_ADDRESS = (import.meta.env.VITE_MOCK_ERC20_ADDRESS || ETH_ADDRESS) as Address

// Chainlink VRF Coordinator (Sepolia)
export const VRF_COORDINATOR_ADDRESS = (import.meta.env.VITE_VRF_COORDINATOR_ADDRESS || '0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625') as Address

// Auto-detect mock mode
export const USE_MOCK_CONTRACTS = import.meta.env.VITE_USE_MOCK === 'true' || GAME_CORE_ADDRESS === ETH_ADDRESS
