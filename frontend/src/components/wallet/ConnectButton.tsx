import { useWallet } from '@/hooks/useWallet'
import { useEnsName } from '@/hooks/useEnsName'
import { Button } from '@/components/common/Button'
import { AccountBadge } from './AccountBadge'
import { toast } from '@/components/common/Toast'

export function ConnectButton() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet()
  const { displayName } = useEnsName(address)

  const handleConnect = async () => {
    try {
      await connect()
      toast('Wallet connected', 'success')
    } catch (error) {
      toast((error as Error).message, 'error')
    }
  }

  if (isConnecting) {
    return <Button disabled loading size="sm">Connecting...</Button>
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <AccountBadge address={address} displayName={displayName} />
        <Button variant="secondary" size="sm" onClick={disconnect}>
          Disconnect
        </Button>
      </div>
    )
  }

  return <Button onClick={handleConnect} size="sm">Connect Wallet</Button>
}
