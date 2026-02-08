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

    // Auto-reconnect wallet
    const wasConnected = localStorage.getItem('walletConnected')
    if (wasConnected === 'true' && !isConnected) {
      connect().catch(console.error)
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
