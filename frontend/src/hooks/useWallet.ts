import { useWalletStore } from '@/stores/walletStore'
import { SEPOLIA_CHAIN_ID } from '@/contracts/types'

export function useWallet() {
  const store = useWalletStore()

  return {
    address: store.address,
    chainId: store.chainId,
    isConnected: store.isConnected,
    isConnecting: store.isConnecting,
    ethBalance: store.ethBalance,
    erc20Balances: store.erc20Balances,
    connect: store.connect,
    disconnect: store.disconnect,
    switchToSepolia: store.switchToSepolia,
    updateBalances: store.updateBalances,
    isCorrectNetwork: store.chainId === SEPOLIA_CHAIN_ID,
  }
}
