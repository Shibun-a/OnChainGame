import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { useGameStore } from '@/stores/gameStore'
import { Card } from '@/components/common/Card'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { BetHistory } from '@/components/game/BetHistory'
import { formatEth } from '@/utils/format'

export default function HomePage() {
  const { isConnected } = useWallet()
  const { config, diceBets, pokerBets, loadConfig } = useGameStore()

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  return (
    <div>
      {/* Hero */}
      <section className="text-center py-12 md:py-20">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          OnChain Game Platform
        </h1>
        <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
          Provably fair games powered by Chainlink VRF v2. Every result is verifiable on-chain.
        </p>
        {!isConnected && (
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        )}
      </section>

      {/* Game Config Stats */}
      {config && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'House Edge', value: `${config.houseEdgeBps / 100}%` },
            { label: 'Min Bet', value: `${formatEth(config.minBet)} ETH` },
            { label: 'Max Bet', value: `${formatEth(config.maxBet)} ETH` },
            { label: 'Reward Pool', value: `${formatEth(config.rewardPool)} ETH` },
          ].map(s => (
            <Card key={s.label} className="text-center">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className="text-lg font-bold mt-1">{s.value}</p>
            </Card>
          ))}
        </section>
      )}

      {/* Game Selection */}
      <section className="grid md:grid-cols-2 gap-6 mb-12">
        <Link to="/dice" className="group">
          <Card className="hover:border-blue-500/50 transition-all h-full">
            <div className="text-5xl mb-4">🎲</div>
            <h2 className="text-2xl font-bold mb-2 group-hover:text-blue-400 transition-colors">Dice Game</h2>
            <p className="text-gray-400 mb-4">
              Choose your multiplier (2x, 5x, 10x) and roll the dice. Higher multipliers mean bigger payouts but lower chances.
            </p>
            <div className="flex gap-2">
              <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded">2x - 50% chance</span>
              <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded">5x - 20% chance</span>
              <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded">10x - 10% chance</span>
            </div>
          </Card>
        </Link>

        <Link to="/poker" className="group">
          <Card className="hover:border-purple-500/50 transition-all h-full">
            <div className="text-5xl mb-4">♠️</div>
            <h2 className="text-2xl font-bold mb-2 group-hover:text-purple-400 transition-colors">Poker Game</h2>
            <p className="text-gray-400 mb-4">
              Simplified 3-card poker. Beat the dealer to win 2x your bet. Straight Flush &gt; 3-of-a-Kind &gt; Straight &gt; Flush &gt; Pair &gt; High Card.
            </p>
            <div className="flex gap-2">
              <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-1 rounded">Win = 2x payout</span>
              <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-1 rounded">Tie = refund</span>
            </div>
          </Card>
        </Link>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-4 mb-12">
        <Card className="text-center">
          <div className="text-3xl mb-2">🏆</div>
          <h3 className="font-bold mb-1">NFT Achievements</h3>
          <p className="text-sm text-gray-400">Auto-minted on your first bet. Collect them all!</p>
        </Card>
        <Card className="text-center">
          <div className="text-3xl mb-2">🤝</div>
          <h3 className="font-bold mb-1">Referral Rewards</h3>
          <p className="text-sm text-gray-400">Earn 1% of bets from users you refer.</p>
        </Card>
        <Card className="text-center">
          <div className="text-3xl mb-2">🔗</div>
          <h3 className="font-bold mb-1">ENS Integration</h3>
          <p className="text-sm text-gray-400">Your ENS name displayed across the platform.</p>
        </Card>
      </section>

      {/* Recent Bets */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Recent Bets</h2>
        <BetHistory
          diceBets={Array.from(diceBets.values())}
          pokerBets={Array.from(pokerBets.values())}
          filter="all"
        />
      </section>
    </div>
  )
}
