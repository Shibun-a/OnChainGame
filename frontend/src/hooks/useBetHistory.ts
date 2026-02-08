import { useEffect } from 'react'
import type { Address } from 'viem'
import { useGameStore } from '@/stores/gameStore'

export function useBetHistory(playerAddress: Address | null) {
  const { loadBetHistory } = useGameStore()

  useEffect(() => {
    if (!playerAddress) return
    loadBetHistory(playerAddress)
  }, [playerAddress, loadBetHistory])
}
