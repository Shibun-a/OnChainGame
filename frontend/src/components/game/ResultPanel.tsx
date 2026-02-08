import { Card } from '@/components/common/Card'
import { PendingBadge } from './PendingBadge'
import { formatEth, formatCards, formatHandRank } from '@/utils/format'
import { cn } from '@/utils/format'
import type { DiceBet, PokerBet } from '@/contracts/types'

interface DiceResultPanelProps {
  bet: DiceBet
}

export function DiceResultPanel({ bet }: DiceResultPanelProps) {
  if (!bet.settled) return <PendingBadge requestId={bet.requestId} />

  const isWin = bet.win

  return (
    <Card className={cn(
      'border-2',
      isWin ? 'border-green-500/50 bg-green-900/10' : 'border-red-500/50 bg-red-900/10',
    )}>
      <div className="text-center">
        <div className="text-5xl mb-3">{isWin ? '🎉' : '😔'}</div>
        <h3 className={cn('text-2xl font-bold mb-4', isWin ? 'text-green-400' : 'text-red-400')}>
          {isWin ? 'You Won!' : 'You Lost'}
        </h3>

        <div className="bg-gray-900/50 rounded-lg p-4 mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Dice Result</span>
            <span className="text-xl font-bold">{bet.result}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Win Threshold</span>
            <span>&gt; {bet.multiplier === 2 ? 50 : bet.multiplier === 5 ? 80 : 90}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Multiplier</span>
            <span>{bet.multiplier}x</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-gray-700">
          <span className="text-gray-400">Payout</span>
          <span className={cn('text-xl font-bold', isWin ? 'text-green-400' : 'text-red-400')}>
            {formatEth(bet.payout ?? 0n)} ETH
          </span>
        </div>
      </div>
    </Card>
  )
}

interface PokerResultPanelProps {
  bet: PokerBet
}

export function PokerResultPanel({ bet }: PokerResultPanelProps) {
  if (!bet.settled) return <PendingBadge requestId={bet.requestId} />

  const isWin = bet.result === 'win'
  const isTie = bet.result === 'tie'

  return (
    <Card className={cn(
      'border-2',
      isWin ? 'border-green-500/50 bg-green-900/10' :
      isTie ? 'border-yellow-500/50 bg-yellow-900/10' :
      'border-red-500/50 bg-red-900/10',
    )}>
      <div className="text-center">
        <div className="text-5xl mb-3">
          {isWin ? '🎉' : isTie ? '🤝' : '😔'}
        </div>
        <h3 className={cn(
          'text-2xl font-bold mb-4',
          isWin ? 'text-green-400' : isTie ? 'text-yellow-400' : 'text-red-400',
        )}>
          {isWin ? 'You Won!' : isTie ? 'Push (Tie)' : 'You Lost'}
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-900/50 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-2">Your Hand</p>
            <p className="text-lg font-mono">{formatCards(bet.playerCards ?? [])}</p>
            <p className="text-sm text-gray-300 mt-1">{formatHandRank(bet.playerHandRank ?? 0)}</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-2">Dealer Hand</p>
            <p className="text-lg font-mono">{formatCards(bet.dealerCards ?? [])}</p>
            <p className="text-sm text-gray-300 mt-1">{formatHandRank(bet.dealerHandRank ?? 0)}</p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-gray-700">
          <span className="text-gray-400">Payout</span>
          <span className={cn(
            'text-xl font-bold',
            isWin ? 'text-green-400' : isTie ? 'text-yellow-400' : 'text-red-400',
          )}>
            {formatEth(bet.payout ?? 0n)} ETH
          </span>
        </div>
      </div>
    </Card>
  )
}
