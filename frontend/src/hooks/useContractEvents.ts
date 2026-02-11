import { useEffect } from 'react'
import type { Address } from 'viem'
import { useGameStore } from '@/stores/gameStore'
import { useAchievementStore } from '@/stores/achievementStore'
import { useWalletStore } from '@/stores/walletStore'
import { USE_MOCK_CONTRACTS } from '@/contracts'
import { publicClient } from '@/contracts/clients'
import { GAME_CORE_ADDRESS } from '@/contracts/addresses'
import GameCoreABI from '@/contracts/abi/GameCore.json'

export function useContractEvents() {
  const { updateDiceResult, updatePokerResult } = useGameStore()
  const { markEarned } = useAchievementStore()
  const address = useWalletStore(state => state.address)

  useEffect(() => {
    if (USE_MOCK_CONTRACTS) {
      // === Mock mode: keep existing CustomEvent logic ===
      const handleDiceSettled = (e: Event) => {
        const { requestId } = (e as CustomEvent).detail
        updateDiceResult(BigInt(requestId))
      }

      const handlePokerSettled = (e: Event) => {
        const { requestId } = (e as CustomEvent).detail
        updatePokerResult(BigInt(requestId))
      }

      const handleAchievement = (e: Event) => {
        const { player, achievementId, tokenId } = (e as CustomEvent).detail
        if (!address || !player || player.toLowerCase() !== address.toLowerCase()) return
        markEarned(achievementId, BigInt(tokenId))
      }

      window.addEventListener('mock:DiceBetSettled', handleDiceSettled)
      window.addEventListener('mock:PokerBetSettled', handlePokerSettled)
      window.addEventListener('mock:AchievementMinted', handleAchievement)

      return () => {
        window.removeEventListener('mock:DiceBetSettled', handleDiceSettled)
        window.removeEventListener('mock:PokerBetSettled', handlePokerSettled)
        window.removeEventListener('mock:AchievementMinted', handleAchievement)
      }
    }

    // === Real mode: watch on-chain events via viem ===
    const unwatchDice = publicClient.watchContractEvent({
      address: GAME_CORE_ADDRESS,
      abi: GameCoreABI,
      eventName: 'DiceBetSettled',
      onLogs: (logs) => {
        for (const log of logs) {
          updateDiceResult((log.args as { requestId: bigint }).requestId)
        }
      },
    })

    const unwatchPoker = publicClient.watchContractEvent({
      address: GAME_CORE_ADDRESS,
      abi: GameCoreABI,
      eventName: 'PokerBetSettled',
      onLogs: (logs) => {
        for (const log of logs) {
          updatePokerResult((log.args as { requestId: bigint }).requestId)
        }
      },
    })

    const unwatchAchievement = publicClient.watchContractEvent({
      address: GAME_CORE_ADDRESS,
      abi: GameCoreABI,
      eventName: 'AchievementMinted',
      onLogs: (logs) => {
        for (const log of logs) {
          const { player, achievementId, tokenId } = log.args as {
            player: Address
            achievementId: bigint
            tokenId: bigint
          }
          if (address && player.toLowerCase() === address.toLowerCase()) {
            markEarned(Number(achievementId), tokenId)
          }
        }
      },
    })

    return () => {
      unwatchDice()
      unwatchPoker()
      unwatchAchievement()
    }
  }, [address, updateDiceResult, updatePokerResult, markEarned])
}
