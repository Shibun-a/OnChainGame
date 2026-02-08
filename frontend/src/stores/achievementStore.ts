import { create } from 'zustand'
import type { Address } from 'viem'
import type { Achievement } from '@/contracts/types'
import { contractClient } from '@/contracts'

interface AchievementState {
  achievements: Achievement[]
  isLoading: boolean

  loadAchievements: (player: Address) => Promise<void>
  markEarned: (achievementId: number, tokenId: bigint) => void
}

export const useAchievementStore = create<AchievementState>((set, get) => ({
  achievements: [],
  isLoading: false,

  loadAchievements: async (player) => {
    set({ isLoading: true })
    try {
      const achievements = await contractClient.getAchievements(player)
      set({ achievements, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      console.error('Failed to load achievements:', error)
    }
  },

  markEarned: (achievementId, tokenId) => {
    const achievements = get().achievements.map(a =>
      a.id === achievementId ? { ...a, earned: true, tokenId } : a,
    )
    set({ achievements })
  },
}))
