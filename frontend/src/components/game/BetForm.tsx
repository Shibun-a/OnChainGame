import { useState, useMemo } from 'react'
import { parseEther } from 'viem'
import { useWallet } from '@/hooks/useWallet'
import { useGameStore } from '@/stores/gameStore'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { BetSummary } from './BetSummary'
import { toast } from '@/components/common/Toast'
import { formatEth, cn } from '@/utils/format'
import { DICE_MULTIPLIERS, ETH_ADDRESS } from '@/contracts/types'

interface BetFormProps {
  gameType: 'dice' | 'poker'
  onBetPlaced: (requestId: bigint) => void
}

export function BetForm({ gameType, onBetPlaced }: BetFormProps) {
  const { address, isConnected, ethBalance } = useWallet()
  const { config, isPlacingBet, placeDiceBet, placePokerBet } = useGameStore()
  const [amount, setAmount] = useState('')
  const [multiplier, setMultiplier] = useState(2)

  const amountBigInt = useMemo(() => {
    try {
      if (!amount || parseFloat(amount) <= 0) return 0n
      return parseEther(amount)
    } catch {
      return 0n
    }
  }, [amount])

  const validation = useMemo(() => {
    if (!config) return { valid: false, error: 'Loading...' }
    if (!amount || amountBigInt === 0n) return { valid: false, error: '' }
    if (amountBigInt < config.minBet) return { valid: false, error: `Min bet: ${formatEth(config.minBet)} ETH` }
    if (amountBigInt > config.maxBet) return { valid: false, error: `Max bet: ${formatEth(config.maxBet)} ETH` }
    if (amountBigInt > ethBalance) return { valid: false, error: 'Insufficient balance' }

    const mult = gameType === 'dice' ? multiplier : 2
    const maxPayout = (amountBigInt * BigInt(mult) * BigInt(10000 - config.houseEdgeBps)) / 10000n
    if (maxPayout > config.rewardPool) return { valid: false, error: 'Reward pool insufficient' }

    return { valid: true, error: '' }
  }, [config, amount, amountBigInt, ethBalance, multiplier, gameType])

  const handleSubmit = async () => {
    if (!address || !validation.valid) return

    try {
      const chosenNumber = Math.floor(Math.random() * 100) + 1
      let requestId: bigint

      if (gameType === 'dice') {
        requestId = await placeDiceBet(address, chosenNumber, multiplier, ETH_ADDRESS, amountBigInt)
      } else {
        requestId = await placePokerBet(address, ETH_ADDRESS, amountBigInt)
      }

      toast('Bet placed! Waiting for result...', 'info')
      onBetPlaced(requestId)
      setAmount('')
    } catch (error) {
      toast((error as Error).message, 'error')
    }
  }

  if (!isConnected) {
    return (
      <Card>
        <p className="text-gray-400 text-center py-4">Connect your wallet to place bets</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="text-lg font-bold mb-4">
          {gameType === 'dice' ? 'Place Dice Bet' : 'Place Poker Bet'}
        </h3>

        {/* Token display (ETH only for now) */}
        <div className="mb-4">
          <label className="text-sm text-gray-400 mb-1 block">Token</label>
          <div className="bg-gray-700 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <span className="font-medium">ETH</span>
            <span className="text-sm text-gray-400">Balance: {formatEth(ethBalance)}</span>
          </div>
        </div>

        {/* Amount input */}
        <div className="mb-4">
          <label className="text-sm text-gray-400 mb-1 block">Amount</label>
          <div className="relative">
            <input
              type="number"
              step="0.001"
              min="0"
              placeholder="0.0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-gray-700 rounded-lg px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-blue-500 pr-16"
            />
            <button
              onClick={() => {
                if (config && ethBalance > 0n) {
                  const max = ethBalance < config.maxBet ? ethBalance : config.maxBet
                  setAmount(formatEth(max))
                }
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-400 hover:text-blue-300 bg-blue-900/30 px-2 py-1 rounded"
            >
              MAX
            </button>
          </div>
          {validation.error && (
            <p className="text-red-400 text-xs mt-1">{validation.error}</p>
          )}
        </div>

        {/* Multiplier selector (dice only) */}
        {gameType === 'dice' && (
          <div className="mb-4">
            <label className="text-sm text-gray-400 mb-2 block">Multiplier</label>
            <div className="grid grid-cols-3 gap-2">
              {DICE_MULTIPLIERS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMultiplier(m.value)}
                  className={cn(
                    'py-3 rounded-lg text-center transition-all border',
                    multiplier === m.value
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600',
                  )}
                >
                  <div className="text-lg font-bold">{m.label}</div>
                  <div className="text-xs opacity-70">Win if &gt; {m.threshold}</div>
                  <div className="text-xs opacity-50">{m.chance} chance</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Poker info */}
        {gameType === 'poker' && (
          <div className="mb-4 bg-gray-700/50 rounded-lg p-3 text-sm text-gray-400">
            <p>3-card poker: Beat the dealer to win 2x (minus 2% house edge)</p>
            <p className="mt-1">Three of a Kind &gt; Pair &gt; High Card</p>
          </div>
        )}

        {/* Submit */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={!validation.valid || isPlacingBet}
          loading={isPlacingBet}
        >
          {isPlacingBet ? 'Placing Bet...' : gameType === 'dice' ? 'Roll Dice' : 'Deal Cards'}
        </Button>
      </Card>

      {/* Summary */}
      {config && amountBigInt > 0n && (
        <BetSummary
          amount={amountBigInt}
          multiplier={multiplier}
          gameType={gameType}
          config={config}
        />
      )}
    </div>
  )
}
