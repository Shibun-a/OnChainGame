import { Card } from '@/components/common/Card'
import { formatEth, formatTimestamp, cn } from '@/utils/format'
import type { DiceBet, PokerBet } from '@/contracts/types'
import { useGameStore } from '@/stores/gameStore'
import { ETH_ADDRESS } from '@/contracts/types'

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
  win?: boolean
  result?: 'win' | 'loss' | 'tie'
  type: 'dice' | 'poker'
  detail: string
}

export function BetHistory({ diceBets, pokerBets, filter = 'all' }: BetHistoryProps) {
  const allBets: AnyBet[] = []
  const { tokenInfo } = useGameStore()

  if (filter !== 'poker') {
    diceBets.forEach(b => allBets.push({
      requestId: b.requestId,
      amount: b.amount,
      timestamp: b.timestamp,
      settled: b.settled,
      payout: b.payout,
      win: b.win,
      result: b.win ? 'win' : 'loss',
      type: 'dice',
      detail: `${b.multiplier}x | Roll: ${b.result ?? '...'} | ${b.token === ETH_ADDRESS ? 'ETH' : (tokenInfo.get(b.token)?.symbol || 'TOKEN')}`,
    }))
  }

  if (filter !== 'dice') {
    pokerBets.forEach(b => allBets.push({
      requestId: b.requestId,
      amount: b.amount,
      timestamp: b.timestamp,
      settled: b.settled,
      payout: b.payout,
      win: b.result === 'win',
      result: b.result,
      type: 'poker',
      detail: `${b.settled ? (b.result === 'tie' ? 'Tie (Refund)' : b.result ?? 'pending') : 'pending'} | ${b.token === ETH_ADDRESS ? 'ETH' : (tokenInfo.get(b.token)?.symbol || 'TOKEN')}`,
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
                <td className="py-2 px-2 text-right font-mono">
                  {formatEth(bet.amount)} {bet.detail.split('|').pop()?.trim()}
                </td>
                <td className="py-2 px-2 text-gray-300">{bet.detail}</td>
                <td className="py-2 px-2 text-center">
                  {!bet.settled ? (
                    <span className="text-yellow-400 text-xs">Pending</span>
                  ) : bet.result === 'win' ? (
                    <span className="text-green-400 text-xs font-semibold">Win</span>
                  ) : bet.result === 'tie' ? (
                    <span className="text-gray-400 text-xs font-semibold">Tie</span>
                  ) : (
                    <span className="text-red-400 text-xs">Loss</span>
                  )}
                </td>
                <td className="py-2 px-2 text-right font-mono">
                  {bet.settled ? `${formatEth(bet.payout ?? 0n)} ${bet.detail.split('|').pop()?.trim()}` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
