import { useWallet } from '@/hooks/useWallet'
import { SEPOLIA_CHAIN_ID } from '@/contracts/types'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'

export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { chainId, isConnected, switchToSepolia } = useWallet()

  if (isConnected && chainId && chainId !== SEPOLIA_CHAIN_ID) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <div className="text-4xl mb-4">&#9888;</div>
          <h2 className="text-2xl font-bold mb-2">Wrong Network</h2>
          <p className="text-gray-400 mb-6">
            Please switch to Sepolia Testnet to use this platform.
          </p>
          <Button onClick={switchToSepolia}>Switch to Sepolia</Button>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
