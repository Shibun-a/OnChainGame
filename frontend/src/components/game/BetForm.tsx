import { useState, useMemo, useEffect } from 'react'
import type { Address } from 'viem'
import { parseEther } from 'viem'
import { useWallet } from '@/hooks/useWallet'
import { useGameStore } from '@/stores/gameStore'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { BetSummary } from './BetSummary'
import { toast } from '@/components/common/Toast'
import { formatEth, cn } from '@/utils/format'
import { DICE_MULTIPLIERS, ETH_ADDRESS } from '@/contracts/types'
import { GAME_CORE_ADDRESS } from '@/contracts/addresses'
import { publicClient } from '@/contracts/clients'

interface BetFormProps {
  gameType: 'dice' | 'poker'
  onBetPlaced: (requestId: bigint) => void
}

export function BetForm({ gameType, onBetPlaced }: BetFormProps) {
  const { address, isConnected, ethBalance } = useWallet()
  const { config, isPlacingBet, placeDiceBet, placePokerBet, supportedTokens, tokenInfo, loadSupportedTokens } = useGameStore()
  const [amount, setAmount] = useState('')
  const [multiplier, setMultiplier] = useState(2)
  const [selectedToken, setSelectedToken] = useState<Address>(ETH_ADDRESS)
  const [selectedBalance, setSelectedBalance] = useState<bigint>(0n)
  const [contractPool, setContractPool] = useState<bigint>(0n)

  const amountBigInt = useMemo(() => {
    try {
      if (!amount || parseFloat(amount) <= 0) return 0n
      return parseEther(amount)
    } catch {
      return 0n
    }
  }, [amount])

  useEffect(() => {
    if (supportedTokens.length === 0) {
      loadSupportedTokens()
    }
  }, [supportedTokens.length, loadSupportedTokens])

  useEffect(() => {
    if (!address) {
      setSelectedBalance(0n)
      return
    }
    if (selectedToken === ETH_ADDRESS) {
      setSelectedBalance(ethBalance)
      return
    }
    const ERC20_ABI = [
      {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }],
      },
    ] as const
    ;(async () => {
      try {
        const bal = await publicClient.readContract({
          address: selectedToken,
          abi: ERC20_ABI as any,
          functionName: 'balanceOf',
          args: [address],
        }) as bigint
        setSelectedBalance(bal)
      } catch {
        setSelectedBalance(0n)
      }
    })()
  }, [address, selectedToken, ethBalance])

  useEffect(() => {
    if (!config) {
      setContractPool(0n)
      return
    }
    if (selectedToken === ETH_ADDRESS) {
      setContractPool(config.rewardPool)
      return
    }
    const ERC20_ABI = [
      {
        type: 'function',
        name: 'balanceOf',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }],
      },
    ] as const
    ;(async () => {
      try {
        const bal = await publicClient.readContract({
          address: selectedToken,
          abi: ERC20_ABI as any,
          functionName: 'balanceOf',
          args: [GAME_CORE_ADDRESS],
        }) as bigint
        setContractPool(bal)
      } catch {
        setContractPool(0n)
      }
    })()
  }, [config, selectedToken])

  const validation = useMemo(() => {
    if (!config) return { valid: false, error: 'Loading...' }
    if (!amount || amountBigInt === 0n) return { valid: false, error: '' }
    if (amountBigInt < config.minBet) return { valid: false, error: `Min bet: ${formatEth(config.minBet)} ETH` }
    if (amountBigInt > config.maxBet) return { valid: false, error: `Max bet: ${formatEth(config.maxBet)} ETH` }
    if (amountBigInt > selectedBalance) return { valid: false, error: 'Insufficient balance' }

    const mult = gameType === 'dice' ? multiplier : 2
    const maxPayout = (amountBigInt * BigInt(mult) * BigInt(10000 - config.houseEdgeBps)) / 10000n
    if (maxPayout > contractPool) return { valid: false, error: 'Reward pool insufficient' }

    return { valid: true, error: '' }
  }, [config, amount, amountBigInt, selectedBalance, multiplier, gameType, contractPool])

  const handleSubmit = async () => {
    if (!address || !validation.valid) return

    try {
      const chosenNumber = Math.floor(Math.random() * 100) + 1
      let requestId: bigint

      if (gameType === 'dice') {
        requestId = await placeDiceBet(address, chosenNumber, multiplier, selectedToken, amountBigInt)
      } else {
        requestId = await placePokerBet(address, selectedToken, amountBigInt)
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

        <div className="mb-4">
          <label className="text-sm text-gray-400 mb-1 block">Token</label>
          <div className="bg-gray-700 rounded-lg px-4 py-2.5 flex items-center justify-between gap-3">
            <select
              value={selectedToken}
              onChange={e => setSelectedToken(e.target.value as Address)}
              className="bg-gray-800 rounded px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              {supportedTokens.map(t => {
                const info = tokenInfo.get(t)
                const label = info ? info.symbol : t.slice(0,6) + '...' + t.slice(-4)
                return (
                  <option key={t} value={t}>{label}</option>
                )
              })}
            </select>
            <span className="text-sm text-gray-400">Balance: {formatEth(selectedBalance)}</span>
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
                if (config && selectedBalance > 0n) {
                  const max = selectedBalance < config.maxBet ? selectedBalance : config.maxBet
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
            <p className="mt-1">Straight Flush &gt; 3-of-a-Kind &gt; Straight &gt; Flush &gt; Pair &gt; High Card</p>
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
          tokenSymbol={selectedToken === ETH_ADDRESS ? 'ETH' : (tokenInfo.get(selectedToken)?.symbol || 'TOKEN')}
        />
      )}
    </div>
  )
}
