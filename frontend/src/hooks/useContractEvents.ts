import { useEffect } from 'react'
import { useGameStore } from '@/stores/gameStore'
import { useAchievementStore } from '@/stores/achievementStore'
import { useWalletStore } from '@/stores/walletStore'

export function useContractEvents() {
  const { updateDiceResult, updatePokerResult } = useGameStore()
  const { markEarned } = useAchievementStore()
  const address = useWalletStore(state => state.address)

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
  }, [address, updateDiceResult, updatePokerResult, markEarned])
}
