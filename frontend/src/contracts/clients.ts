import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { sepolia, mainnet } from 'viem/chains'

// Sepolia public client for reading contract data
export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(import.meta.env.VITE_RPC_URL || undefined),
})

// Mainnet public client for ENS resolution
export const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(),
})

// Wallet client factory for transactions
export function getWalletClient() {
  if (!window.ethereum) {
    throw new Error('No wallet detected. Please install MetaMask.')
  }
  return createWalletClient({
    chain: sepolia,
    transport: custom(window.ethereum),
  })
}

// Check if wallet is available
export function isWalletAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum
}
