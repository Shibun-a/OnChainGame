import { Card } from '@/components/common/Card'
import { formatEth } from '@/utils/format'
import type { GameConfig } from '@/contracts/types'

interface BetSummaryProps {
  amount: bigint
  multiplier: number
  gameType: 'dice' | 'poker'
  config: GameConfig
}

export function BetSummary({ amount, multiplier, gameType, config }: BetSummaryProps) {
  if (amount === 0n) return null

  const effectiveMultiplier = gameType === 'dice' ? multiplier : 2
  const potentialPayout = (amount * BigInt(effectiveMultiplier) * BigInt(10000 - config.houseEdgeBps)) / 10000n

  const winChance = gameType === 'dice'
    ? multiplier === 2 ? '50%' : multiplier === 5 ? '20%' : '10%'
    : '~33%'

  return (
    <Card className="border-blue-800/50">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">Bet Summary</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Bet Amount</span>
          <span>{formatEth(amount)} ETH</span>
        </div>
        {gameType === 'dice' && (
          <div className="flex justify-between">
            <span className="text-gray-400">Multiplier</span>
            <span>{multiplier}x</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-400">Win Chance</span>
          <span>{winChance}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">House Edge</span>
          <span>{config.houseEdgeBps / 100}%</span>
        </div>
        <div className="border-t border-gray-700 pt-2 flex justify-between">
          <span className="text-gray-300 font-semibold">Potential Payout</span>
          <span className="text-green-400 font-bold">{formatEth(potentialPayout)} ETH</span>
        </div>
      </div>
    </Card>
  )
}
