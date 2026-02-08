import { useWallet } from '@/hooks/useWallet'
import { useEnsName } from '@/hooks/useEnsName'
import { useBetHistory } from '@/hooks/useBetHistory'
import { Card } from '@/components/common/Card'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { StatsPanel } from '@/components/profile/StatsPanel'
import { AchievementsList } from '@/components/profile/AchievementsList'
import { ReferralPanel } from '@/components/profile/ReferralPanel'
import { BetHistory } from '@/components/game/BetHistory'
import { useGameStore } from '@/stores/gameStore'
import { formatEth, formatAddress } from '@/utils/format'

export default function ProfilePage() {
  const { address, isConnected, ethBalance } = useWallet()
  const { ensName } = useEnsName(address)
  const { diceBets, pokerBets } = useGameStore()

  useBetHistory(address)

  if (!isConnected || !address) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">👤</div>
        <h1 className="text-4xl font-bold mb-4">Profile</h1>
        <p className="text-gray-400 mb-8">Connect your wallet to view your profile</p>
        <div className="flex justify-center"><ConnectButton /></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Profile</h1>

      {/* Player Info */}
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0" />
          <div>
            {ensName && <p className="text-xl font-bold">{ensName}</p>}
            <p className="font-mono text-sm text-gray-400">{formatAddress(address)}</p>
            <p className="text-sm text-gray-300 mt-1">{formatEth(ethBalance)} ETH</p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="mb-6">
        <StatsPanel />
      </div>

      {/* Achievements */}
      <div className="mb-6">
        <AchievementsList address={address} />
      </div>

      {/* Referral */}
      <div className="mb-6">
        <ReferralPanel address={address} />
      </div>

      {/* All Bet History */}
      <div>
        <h2 className="text-2xl font-bold mb-4">All Bet History</h2>
        <BetHistory
          diceBets={Array.from(diceBets.values())}
          pokerBets={Array.from(pokerBets.values())}
          filter="all"
        />
      </div>
    </div>
  )
}
