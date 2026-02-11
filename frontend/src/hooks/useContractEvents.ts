import { useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useAchievementStore } from '@/stores/achievementStore'
import { publicClient } from '@/contracts/clients'
import { GAME_CORE_ADDRESS, USE_MOCK_CONTRACTS } from '@/contracts/addresses'
import GameCoreABI from '@/contracts/abi/GameCore.json'

export function useContractEvents() {
  const { pendingRequests, updateDiceResult, updatePokerResult } = useGameStore()
  const { markEarned } = useAchievementStore()
  const address = useWalletStore(state => state.address)

  // 1. Setup Event Listeners (WebSockets / Polling Logs)
  useEffect(() => {
    // Handler for Mock Events
    const handleMockDiceSettled = (e: Event) => {
      const { requestId } = (e as CustomEvent).detail
      updateDiceResult(BigInt(requestId))
    }

    const handleMockPokerSettled = (e: Event) => {
      const { requestId } = (e as CustomEvent).detail
      updatePokerResult(BigInt(requestId))
    }

    const handleMockAchievement = (e: Event) => {
      const { achievementId, tokenId } = (e as CustomEvent).detail
      markEarned(achievementId, BigInt(tokenId))
    }

    if (USE_MOCK_CONTRACTS) {
      window.addEventListener('mock:DiceBetSettled', handleMockDiceSettled)
      window.addEventListener('mock:PokerBetSettled', handleMockPokerSettled)
      window.addEventListener('mock:AchievementMinted', handleMockAchievement)

      return () => {
        window.removeEventListener('mock:DiceBetSettled', handleMockDiceSettled)
        window.removeEventListener('mock:PokerBetSettled', handleMockPokerSettled)
        window.removeEventListener('mock:AchievementMinted', handleMockAchievement)
      }
    } else {
      // Real Contract Events
      console.log('Setting up real contract event listeners for:', GAME_CORE_ADDRESS)

      const unwatchDice = publicClient.watchContractEvent({
        address: GAME_CORE_ADDRESS,
        abi: GameCoreABI.abi,
        eventName: 'DiceBetSettled',
        onLogs: (logs) => {
          logs.forEach(log => {
            // @ts-ignore
            const requestId = log.args.requestId
            console.log('Dice Settled Event:', requestId)
            if (requestId) updateDiceResult(requestId)
          })
        }
      })

      const unwatchPoker = publicClient.watchContractEvent({
        address: GAME_CORE_ADDRESS,
        abi: GameCoreABI.abi,
        eventName: 'PokerBetSettled',
        onLogs: (logs) => {
          logs.forEach(log => {
            // @ts-ignore
            const requestId = log.args.requestId
            console.log('Poker Settled Event:', requestId)
            if (requestId) updatePokerResult(requestId)
          })
        }
      })

      return () => {
        unwatchDice()
        unwatchPoker()
      }
    }
  }, [updateDiceResult, updatePokerResult, markEarned])

  // 2. Active Polling Fallback (For when events are missed or delayed)
  // Polls every 2 seconds if there are pending requests
  useEffect(() => {
    if (pendingRequests.size === 0) return

    console.log('Active polling started for requests:', Array.from(pendingRequests).map(String))

    const intervalId = setInterval(() => {
      pendingRequests.forEach(requestId => {
        // We try both because we don't track which type of bet it is in pendingRequests set
        // The store methods handle non-existent bets gracefully
        updateDiceResult(requestId)
        updatePokerResult(requestId)
      })
    }, 5000)

    return () => clearInterval(intervalId)
  }, [pendingRequests, updateDiceResult, updatePokerResult])
}
