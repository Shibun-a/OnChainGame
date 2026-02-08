import { create } from 'zustand'
import type { Address } from 'viem'
import type { GameConfig, DiceBet, PokerBet, TokenInfo } from '@/contracts/types'
import { contractClient } from '@/contracts'

interface GameState {
  config: GameConfig | null
  supportedTokens: Address[]
  tokenInfo: Map<Address, TokenInfo>
  diceBets: Map<bigint, DiceBet>
  pokerBets: Map<bigint, PokerBet>
  pendingRequests: Set<bigint>
  isLoadingConfig: boolean
  isPlacingBet: boolean

  loadConfig: () => Promise<void>
  loadSupportedTokens: () => Promise<void>
  placeDiceBet: (player: Address, chosenNumber: number, multiplier: number, token: Address, amount: bigint) => Promise<bigint>
  placePokerBet: (player: Address, token: Address, amount: bigint) => Promise<bigint>
  updateDiceResult: (requestId: bigint) => Promise<void>
  updatePokerResult: (requestId: bigint) => Promise<void>
  loadBetHistory: (player: Address) => Promise<void>
}

export const useGameStore = create<GameState>((set, get) => ({
  config: null,
  supportedTokens: [],
  tokenInfo: new Map(),
  diceBets: new Map(),
  pokerBets: new Map(),
  pendingRequests: new Set(),
  isLoadingConfig: false,
  isPlacingBet: false,

  loadConfig: async () => {
    set({ isLoadingConfig: true })
    try {
      const config = await contractClient.getGameConfig()
      set({ config, isLoadingConfig: false })
    } catch (error) {
      set({ isLoadingConfig: false })
      console.error('Failed to load game config:', error)
    }
  },

  loadSupportedTokens: async () => {
    try {
      const tokens = await contractClient.getSupportedTokens()
      const infoMap = new Map<Address, TokenInfo>()
      for (const token of tokens) {
        const info = await contractClient.getTokenInfo(token)
        infoMap.set(token, info)
      }
      set({ supportedTokens: tokens, tokenInfo: infoMap })
    } catch (error) {
      console.error('Failed to load tokens:', error)
    }
  },

  placeDiceBet: async (player, chosenNumber, multiplier, token, amount) => {
    set({ isPlacingBet: true })
    try {
      const requestId = await contractClient.betDice(player, chosenNumber, multiplier, token, amount)

      const diceBets = new Map(get().diceBets)
      diceBets.set(requestId, {
        requestId, player, amount, token, chosenNumber, multiplier,
        settled: false, timestamp: Date.now(),
      })

      const pendingRequests = new Set(get().pendingRequests)
      pendingRequests.add(requestId)

      set({ diceBets, pendingRequests, isPlacingBet: false })
      return requestId
    } catch (error) {
      set({ isPlacingBet: false })
      throw error
    }
  },

  placePokerBet: async (player, token, amount) => {
    set({ isPlacingBet: true })
    try {
      const requestId = await contractClient.betPoker(player, token, amount)

      const pokerBets = new Map(get().pokerBets)
      pokerBets.set(requestId, {
        requestId, player, amount, token,
        settled: false, timestamp: Date.now(),
      })

      const pendingRequests = new Set(get().pendingRequests)
      pendingRequests.add(requestId)

      set({ pokerBets, pendingRequests, isPlacingBet: false })
      return requestId
    } catch (error) {
      set({ isPlacingBet: false })
      throw error
    }
  },

  updateDiceResult: async (requestId) => {
    try {
      const result = await contractClient.getDiceResult(requestId)
      if (result && result.settled) {
        const diceBets = new Map(get().diceBets)
        diceBets.set(requestId, result)
        const pendingRequests = new Set(get().pendingRequests)
        pendingRequests.delete(requestId)
        set({ diceBets, pendingRequests })
      }
    } catch (error) {
      console.error('Failed to update dice result:', error)
    }
  },

  updatePokerResult: async (requestId) => {
    try {
      const result = await contractClient.getPokerResult(requestId)
      if (result && result.settled) {
        const pokerBets = new Map(get().pokerBets)
        pokerBets.set(requestId, result)
        const pendingRequests = new Set(get().pendingRequests)
        pendingRequests.delete(requestId)
        set({ pokerBets, pendingRequests })
      }
    } catch (error) {
      console.error('Failed to update poker result:', error)
    }
  },

  loadBetHistory: async (player) => {
    try {
      const [diceHistory, pokerHistory] = await Promise.all([
        contractClient.getDiceBetHistory(player),
        contractClient.getPokerBetHistory(player),
      ])
      const diceBets = new Map(get().diceBets)
      diceHistory.forEach(b => diceBets.set(b.requestId, b))
      const pokerBets = new Map(get().pokerBets)
      pokerHistory.forEach(b => pokerBets.set(b.requestId, b))
      set({ diceBets, pokerBets })
    } catch (error) {
      console.error('Failed to load bet history:', error)
    }
  },
}))
