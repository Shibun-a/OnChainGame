import { useEffect } from 'react'
import type { Address } from 'viem'
import { Card } from '@/components/common/Card'
import { useAchievementStore } from '@/stores/achievementStore'

export function AchievementsList({ address }: { address: Address }) {
  const { achievements, isLoading, loadAchievements } = useAchievementStore()

  useEffect(() => {
    loadAchievements(address)
  }, [address, loadAchievements])

  const icons = ['🎲', '♠️', '💰', '🔥']

  return (
    <Card>
      <h2 className="text-xl font-bold mb-4">Achievements (NFTs)</h2>
      {isLoading ? (
        <p className="text-gray-500 text-center py-4">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {achievements.map((a, i) => (
            <div
              key={a.id}
              className={`rounded-lg border p-4 text-center transition-all ${
                a.earned
                  ? 'border-green-600/50 bg-green-900/10'
                  : 'border-gray-700 bg-gray-800/50 opacity-50'
              }`}
            >
              <div className="text-3xl mb-2">{a.earned ? icons[i] || '🏆' : '🔒'}</div>
              <h3 className="font-semibold text-sm">{a.name}</h3>
              <p className="text-xs text-gray-400 mt-1">{a.description}</p>
              {a.earned && a.tokenId != null && (
                <p className="text-xs text-green-400 mt-2">NFT #{a.tokenId.toString()}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
