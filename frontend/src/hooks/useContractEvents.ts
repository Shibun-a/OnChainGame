import { useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useAchievementStore } from '@/stores/achievementStore'

export function useContractEvents() {
  const { updateDiceResult, updatePokerResult } = useGameStore()
  const { markEarned } = useAchievementStore()

  useEffect(() => {
    const handleDiceSettled = (e: Event) => {
      const { requestId } = (e as CustomEvent).detail
      updateDiceResult(BigInt(requestId))
    }

    const handlePokerSettled = (e: Event) => {
      const { requestId } = (e as CustomEvent).detail
      updatePokerResult(BigInt(requestId))
    }

    const handleAchievement = (e: Event) => {
      const { achievementId, tokenId } = (e as CustomEvent).detail
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
  }, [updateDiceResult, updatePokerResult, markEarned])
}
