import { useState } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { useGameStore } from '@/stores/gameStore'
import { useBetHistory } from '@/hooks/useBetHistory'
import { Card } from '@/components/common/Card'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { BetForm } from '@/components/game/BetForm'
import { PokerResultPanel } from '@/components/game/ResultPanel'
import { BetHistory } from '@/components/game/BetHistory'

export default function PokerPage() {
  const { address, isConnected } = useWallet()
  const { diceBets, pokerBets } = useGameStore()
  const [activeBetId, setActiveBetId] = useState<bigint | null>(null)

  useBetHistory(address)

  const activeBet = activeBetId ? pokerBets.get(activeBetId) : null

  if (!isConnected) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">♠️</div>
        <h1 className="text-4xl font-bold mb-4">Poker Game</h1>
        <p className="text-gray-400 mb-8">Connect your wallet to start playing</p>
        <div className="flex justify-center"><ConnectButton /></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">♠️ Poker Game</h1>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <BetForm gameType="poker" onBetPlaced={setActiveBetId} />
        </div>

        <div>
          {activeBet ? (
            <PokerResultPanel bet={activeBet} />
          ) : (
            <Card>
              <h3 className="text-lg font-bold mb-4">How to Play</h3>
              <ul className="space-y-3 text-gray-400">
                <li className="flex gap-2">
                  <span className="text-purple-400">1.</span>
                  Place your bet
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-400">2.</span>
                  Chainlink VRF generates 6 random cards
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-400">3.</span>
                  3 cards for you, 3 for the dealer
                </li>
                <li className="flex gap-2">
                  <span className="text-purple-400">4.</span>
                  Best hand wins! Tie returns your bet.
                </li>
              </ul>

              <div className="mt-6 space-y-2">
                <h4 className="text-sm font-semibold text-gray-300">Hand Rankings</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between bg-gray-700/50 rounded p-2">
                    <span>Straight Flush</span>
                    <span className="text-purple-400 font-bold">Highest</span>
                  </div>
                  <div className="flex justify-between bg-gray-700/50 rounded p-2">
                    <span>Three of a Kind</span>
                    <span className="text-purple-400 font-semibold">Very High</span>
                  </div>
                  <div className="flex justify-between bg-gray-700/50 rounded p-2">
                    <span>Straight</span>
                    <span className="text-purple-400">High</span>
                  </div>
                  <div className="flex justify-between bg-gray-700/50 rounded p-2">
                    <span>Flush</span>
                    <span className="text-purple-300">Medium</span>
                  </div>
                  <div className="flex justify-between bg-gray-700/50 rounded p-2">
                    <span>Pair</span>
                    <span className="text-purple-200">Low</span>
                  </div>
                  <div className="flex justify-between bg-gray-700/50 rounded p-2">
                    <span>High Card</span>
                    <span className="text-gray-400">Lowest</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-gray-700/30 rounded p-3 text-sm text-gray-400">
                <p><strong className="text-gray-300">Win:</strong> 2x payout (minus 2% house edge)</p>
                <p><strong className="text-gray-300">Tie:</strong> Full refund</p>
                <p><strong className="text-gray-300">Loss:</strong> Bet is lost</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Your Poker History</h2>
        <BetHistory
          diceBets={Array.from(diceBets.values())}
          pokerBets={Array.from(pokerBets.values())}
          filter="poker"
        />
      </div>
    </div>
  )
}
