import { Card } from '@/components/common/Card'
import { useGameStore } from '@/stores/gameStore'
import { formatEth, cn } from '@/utils/format'

export function StatsPanel() {
  const { diceBets, pokerBets } = useGameStore()

  const allBets = [...diceBets.values(), ...pokerBets.values()]
  const settledBets = allBets.filter(b => b.settled)

  const wins = settledBets.filter(b => {
    if ('win' in b) return b.win
    if ('result' in b) return b.result === 'win'
    return false
  })

  const totalWagered = settledBets.reduce((sum, b) => sum + b.amount, 0n)
  const totalWon = settledBets.reduce((sum, b) => sum + (b.payout ?? 0n), 0n)
  const netProfit = totalWon - totalWagered
  const winRate = settledBets.length > 0 ? (wins.length / settledBets.length) * 100 : 0

  const stats = [
    { label: 'Total Bets', value: settledBets.length.toString() },
    { label: 'Win Rate', value: `${winRate.toFixed(1)}%` },
    { label: 'Total Wagered', value: `${formatEth(totalWagered)} ETH` },
    {
      label: 'Net Profit',
      value: `${netProfit >= 0n ? '+' : ''}${formatEth(netProfit)} ETH`,
      color: netProfit >= 0n ? 'text-green-400' : 'text-red-400',
    },
  ]

  return (
    <Card>
      <h2 className="text-xl font-bold mb-4">Statistics</h2>
      <div className="grid grid-cols-2 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-gray-900/50 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={cn('text-xl font-bold', s.color || 'text-white')}>{s.value}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
