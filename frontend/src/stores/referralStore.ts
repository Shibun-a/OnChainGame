import { create } from 'zustand'
import type { Address } from 'viem'
import { contractClient } from '@/contracts'

interface ReferralState {
  referrer: Address | null
  referralRewards: Map<Address, bigint>
  isLoading: boolean
  isClaiming: boolean
  isSettingReferrer: boolean

  loadReferralInfo: (player: Address) => Promise<void>
  setReferrer: (player: Address, referrer: Address) => Promise<void>
  claimRewards: (player: Address) => Promise<void>
}

export const useReferralStore = create<ReferralState>((set) => ({
  referrer: null,
  referralRewards: new Map(),
  isLoading: false,
  isClaiming: false,
  isSettingReferrer: false,

  loadReferralInfo: async (player) => {
    set({ isLoading: true })
    try {
      const [referrer, rewards] = await Promise.all([
        contractClient.getReferrer(player),
        contractClient.getAllReferralRewards(player),
      ])
      set({ referrer, referralRewards: rewards, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      console.error('Failed to load referral info:', error)
    }
  },

  setReferrer: async (player, referrer) => {
    set({ isSettingReferrer: true })
    try {
      await contractClient.setReferrer(player, referrer)
      set({ referrer, isSettingReferrer: false })
    } catch (error) {
      set({ isSettingReferrer: false })
      throw error
    }
  },

  claimRewards: async (player) => {
    set({ isClaiming: true })
    try {
      await contractClient.claimReferralRewards(player)
      set({ referralRewards: new Map(), isClaiming: false })
    } catch (error) {
      set({ isClaiming: false })
      throw error
    }
  },
}))
