import type { Address } from 'viem'
import { useWallet } from '@/hooks/useWallet'
import { formatEth } from '@/utils/format'

interface AccountBadgeProps {
  address: Address
  displayName: string
}

export function AccountBadge({ displayName }: AccountBadgeProps) {
  const { ethBalance } = useWallet()

  return (
    <div className="bg-gray-700 rounded-lg px-4 py-2 flex items-center gap-3">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
      <div>
        <div className="text-sm font-semibold">{displayName}</div>
        <div className="text-xs text-gray-400">{formatEth(ethBalance)} ETH</div>
      </div>
    </div>
  )
}
