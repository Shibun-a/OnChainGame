import { Card } from '@/components/common/Card'
import { formatEth, formatTimestamp, cn } from '@/utils/format'
import type { DiceBet, PokerBet } from '@/contracts/types'

interface BetHistoryProps {
  diceBets: DiceBet[]
  pokerBets: PokerBet[]
  filter?: 'all' | 'dice' | 'poker'
}

type AnyBet = {
  requestId: bigint
  amount: bigint
  timestamp: number
  settled: boolean
  payout?: bigint
  outcome: 'pending' | 'win' | 'loss' | 'tie'
  type: 'dice' | 'poker'
  detail: string
}

export function BetHistory({ diceBets, pokerBets, filter = 'all' }: BetHistoryProps) {
  const allBets: AnyBet[] = []

  if (filter !== 'poker') {
    diceBets.forEach(b => allBets.push({
      requestId: b.requestId,
      amount: b.amount,
      timestamp: b.timestamp,
      settled: b.settled,
      payout: b.payout,
      outcome: !b.settled ? 'pending' : b.win ? 'win' : 'loss',
      type: 'dice',
      detail: `${b.multiplier}x | Roll: ${b.result ?? '...'}`,
    }))
  }

  if (filter !== 'dice') {
    pokerBets.forEach(b => allBets.push({
      requestId: b.requestId,
      amount: b.amount,
      timestamp: b.timestamp,
      settled: b.settled,
      payout: b.payout,
      outcome: !b.settled ? 'pending' : b.result === 'tie' ? 'tie' : b.result === 'win' ? 'win' : 'loss',
      type: 'poker',
      detail: b.settled ? (b.result ?? 'pending') : 'pending',
    }))
  }

  allBets.sort((a, b) => b.timestamp - a.timestamp)
  const displayBets = allBets.slice(0, 15)

  if (displayBets.length === 0) {
    return (
      <Card>
        <p className="text-gray-500 text-center py-4">No bets yet. Place your first bet!</p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2 px-2">Time</th>
              <th className="text-left py-2 px-2">Game</th>
              <th className="text-right py-2 px-2">Amount</th>
              <th className="text-left py-2 px-2">Detail</th>
              <th className="text-center py-2 px-2">Result</th>
              <th className="text-right py-2 px-2">Payout</th>
            </tr>
          </thead>
          <tbody>
            {displayBets.map(bet => (
              <tr key={bet.requestId.toString()} className="border-b border-gray-800 hover:bg-gray-700/30">
                <td className="py-2 px-2 text-gray-400">{formatTimestamp(bet.timestamp)}</td>
                <td className="py-2 px-2">
                  <span className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    bet.type === 'dice' ? 'bg-blue-900/50 text-blue-300' : 'bg-purple-900/50 text-purple-300',
                  )}>
                    {bet.type === 'dice' ? 'Dice' : 'Poker'}
                  </span>
                </td>
                <td className="py-2 px-2 text-right font-mono">{formatEth(bet.amount)}</td>
                <td className="py-2 px-2 text-gray-300">{bet.detail}</td>
                <td className="py-2 px-2 text-center">
                  {bet.outcome === 'pending' ? (
                    <span className="text-yellow-400 text-xs">Pending</span>
                  ) : bet.outcome === 'win' ? (
                    <span className="text-green-400 text-xs font-semibold">Win</span>
                  ) : bet.outcome === 'tie' ? (
                    <span className="text-yellow-300 text-xs font-semibold">Tie</span>
                  ) : (
                    <span className="text-red-400 text-xs">Loss</span>
                  )}
                </td>
                <td className="py-2 px-2 text-right font-mono">
                  {bet.settled ? formatEth(bet.payout ?? 0n) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
