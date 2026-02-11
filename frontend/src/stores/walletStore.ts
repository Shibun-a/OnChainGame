import { create } from 'zustand'
import type { Address } from 'viem'
import { SEPOLIA_CHAIN_ID } from '@/contracts/types'

interface WalletState {
  address: Address | null
  chainId: number | null
  isConnected: boolean
  isConnecting: boolean
  ethBalance: bigint
  erc20Balances: Map<Address, bigint>
  accountsChangedHandler: ((accs: unknown) => void) | null
  chainChangedHandler: ((cId: unknown) => void) | null

  connect: () => Promise<void>
  disconnect: () => void
  switchToSepolia: () => Promise<void>
  updateBalances: () => Promise<void>
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  ethBalance: 0n,
  erc20Balances: new Map(),
  accountsChangedHandler: null,
  chainChangedHandler: null,

  connect: async () => {
    if (!window.ethereum) throw new Error('No wallet detected. Please install MetaMask.')

    set({ isConnecting: true })
    try {
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[]
      if (accounts.length === 0) throw new Error('No accounts found')

      const address = accounts[0] as Address
      const chainIdHex = (await window.ethereum.request({ method: 'eth_chainId' })) as string
      const chainId = parseInt(chainIdHex, 16)

      set({ address, chainId, isConnected: true, isConnecting: false })
      localStorage.setItem('walletConnected', 'true')

      const { accountsChangedHandler, chainChangedHandler } = get()
      if (accountsChangedHandler) {
        window.ethereum.removeListener('accountsChanged', accountsChangedHandler)
      }
      if (chainChangedHandler) {
        window.ethereum.removeListener('chainChanged', chainChangedHandler)
      }

      const handleAccountsChanged = (accs: unknown) => {
        const newAccs = accs as string[]
        if (newAccs.length === 0) {
          get().disconnect()
        } else {
          set({ address: newAccs[0] as Address })
          get().updateBalances()
        }
      }

      const handleChainChanged = (cId: unknown) => {
        set({ chainId: parseInt(cId as string, 16) })
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)
      set({ accountsChangedHandler: handleAccountsChanged, chainChangedHandler: handleChainChanged })

      await get().updateBalances()

      if (chainId !== SEPOLIA_CHAIN_ID) {
        console.warn('Not on Sepolia. Please switch networks.')
      }
    } catch (error) {
      set({ isConnecting: false })
      throw error
    }
  },

  disconnect: () => {
    const { accountsChangedHandler, chainChangedHandler } = get()
    if (window.ethereum) {
      if (accountsChangedHandler) {
        window.ethereum.removeListener('accountsChanged', accountsChangedHandler)
      }
      if (chainChangedHandler) {
        window.ethereum.removeListener('chainChanged', chainChangedHandler)
      }
    }

    set({
      address: null,
      chainId: null,
      isConnected: false,
      ethBalance: 0n,
      erc20Balances: new Map(),
      accountsChangedHandler: null,
      chainChangedHandler: null,
    })
    localStorage.removeItem('walletConnected')
  },

  switchToSepolia: async () => {
    if (!window.ethereum) throw new Error('No wallet detected')
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}` }],
      })
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 4902) {
        await window.ethereum!.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}`,
            chainName: 'Sepolia Testnet',
            nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://rpc.sepolia.org'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          }],
        })
      } else {
        throw error
      }
    }
  },

  updateBalances: async () => {
    const { address } = get()
    if (!address || !window.ethereum) return
    try {
      const balance = (await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      })) as string
      set({ ethBalance: BigInt(balance) })
    } catch (error) {
      console.error('Failed to update balances:', error)
    }
  },
}))
