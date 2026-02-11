import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { useWalletStore } from '@/stores/walletStore'
import { useGameStore } from '@/stores/gameStore'
import { useContractEvents } from '@/hooks/useContractEvents'
import { ToastContainer } from '@/components/common/Toast'

function App() {
  const { connect, isConnected } = useWalletStore()
  const { loadConfig, loadSupportedTokens } = useGameStore()

  // Global event listener for VRF results
  useContractEvents()

  useEffect(() => {
    loadConfig()
    loadSupportedTokens()

    // Auto-reconnect: only check if already authorized, don't prompt
    const shouldAutoReconnect = localStorage.getItem('walletConnected') === 'true'
    if (window.ethereum && !isConnected && shouldAutoReconnect) {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
        const accs = accounts as string[]
        if (accs.length > 0) {
          connect().catch(console.error)
        }
      }).catch(console.error)
    }
  }, [])

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  )
}

export default App
