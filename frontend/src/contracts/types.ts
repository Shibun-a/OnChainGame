import type { Address } from 'viem'

// Constants
export const SEPOLIA_CHAIN_ID = 11155111
export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000' as Address

// Game Configuration
export interface GameConfig {
  houseEdgeBps: number
  minBet: bigint
  maxBet: bigint
  rewardPool: bigint
}

// Token Info
export interface TokenInfo {
  address: Address
  symbol: string
  decimals: number
  isNative: boolean
}

// Player Statistics
export interface PlayerStats {
  totalBets: number
  wins: number
  losses: number
  totalWagered: bigint
  totalWon: bigint
  netProfit: bigint
}

// Dice Game Types
export interface DiceBet {
  requestId: bigint
  player: Address
  amount: bigint
  token: Address
  chosenNumber: number
  multiplier: number
  settled: boolean
  result?: number
  payout?: bigint
  win?: boolean
  timestamp: number
}

export interface DiceResult {
  requestId: bigint
  result: number
  payout: bigint
  win: boolean
}

// Poker Game Types
export interface PokerBet {
  requestId: bigint
  player: Address
  amount: bigint
  token: Address
  settled: boolean
  playerCards?: number[]
  dealerCards?: number[]
  playerHandRank?: number
  dealerHandRank?: number
  payout?: bigint
  result?: 'win' | 'loss' | 'tie'
  timestamp: number
}

export interface PokerResult {
  requestId: bigint
  playerCards: number[]
  dealerCards: number[]
  playerHandRank: number
  dealerHandRank: number
  payout: bigint
  result: 'win' | 'loss' | 'tie'
}

// Achievement Types
export interface Achievement {
  id: number
  name: string
  description: string
  imageUrl: string
  earned: boolean
  tokenId?: bigint
}

// Referral Types
export interface ReferralInfo {
  referrer: Address | null
  referralRewards: Map<Address, bigint>
  totalReferred: number
}

// Event Types
export interface DiceBetPlacedEvent {
  requestId: bigint
  player: Address
  amount: bigint
  token: Address
  chosenNumber: number
  multiplier: number
}

export interface DiceBetSettledEvent {
  requestId: bigint
  result: number
  payout: bigint
  win: boolean
}

export interface PokerBetPlacedEvent {
  requestId: bigint
  player: Address
  amount: bigint
  token: Address
}

export interface PokerBetSettledEvent {
  requestId: bigint
  playerHand: number
  dealerHand: number
  payout: bigint
  win: boolean
}

// Multiplier options for dice game
export const DICE_MULTIPLIERS = [
  { value: 2, threshold: 50, label: '2x', chance: '50%' },
  { value: 5, threshold: 80, label: '5x', chance: '20%' },
  { value: 10, threshold: 90, label: '10x', chance: '10%' },
] as const

// Poker hand ranks
export enum PokerHandRank {
  HighCard = 0,
  Pair = 1,
  ThreeOfAKind = 2,
}

export const POKER_HAND_NAMES: Record<PokerHandRank, string> = {
  [PokerHandRank.HighCard]: 'High Card',
  [PokerHandRank.Pair]: 'Pair',
  [PokerHandRank.ThreeOfAKind]: 'Three of a Kind',
}

// Card display helpers
export const CARD_SUITS = ['♠', '♥', '♦', '♣'] as const
export const CARD_VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const
