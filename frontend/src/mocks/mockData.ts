import type { Address } from 'viem'
import { parseEther } from 'viem'
import type { DiceBet, PokerBet, GameConfig, Achievement } from '@/contracts/types'
import { ETH_ADDRESS } from '@/contracts/addresses'

export const MOCK_PLAYER_ADDRESS = '0x1234567890123456789012345678901234567890' as Address
export const MOCK_ERC20_ADDRESS = '0x0000000000000000000000000000000000000001' as Address

export const mockGameConfig: GameConfig = {
  houseEdgeBps: 200,
  minBet: parseEther('0.001'),
  maxBet: parseEther('1'),
  rewardPool: parseEther('100'),
}

export const mockDiceBetHistory: DiceBet[] = [
  {
    requestId: 1n,
    player: MOCK_PLAYER_ADDRESS,
    amount: parseEther('0.1'),
    token: ETH_ADDRESS,
    chosenNumber: 50,
    multiplier: 2,
    settled: true,
    result: 75,
    payout: parseEther('0.196'),
    win: true,
    timestamp: Date.now() - 3600000,
  },
  {
    requestId: 2n,
    player: MOCK_PLAYER_ADDRESS,
    amount: parseEther('0.05'),
    token: ETH_ADDRESS,
    chosenNumber: 80,
    multiplier: 5,
    settled: true,
    result: 45,
    payout: 0n,
    win: false,
    timestamp: Date.now() - 7200000,
  },
  {
    requestId: 3n,
    player: MOCK_PLAYER_ADDRESS,
    amount: parseEther('0.2'),
    token: ETH_ADDRESS,
    chosenNumber: 90,
    multiplier: 10,
    settled: true,
    result: 95,
    payout: parseEther('1.96'),
    win: true,
    timestamp: Date.now() - 10800000,
  },
]

export const mockPokerBetHistory: PokerBet[] = [
  {
    requestId: 4n,
    player: MOCK_PLAYER_ADDRESS,
    amount: parseEther('0.1'),
    token: ETH_ADDRESS,
    settled: true,
    playerCards: [10, 10, 5],
    dealerCards: [8, 7, 6],
    playerHandRank: 1,
    dealerHandRank: 0,
    payout: parseEther('0.196'),
    result: 'win',
    timestamp: Date.now() - 14400000,
  },
  {
    requestId: 5n,
    player: MOCK_PLAYER_ADDRESS,
    amount: parseEther('0.15'),
    token: ETH_ADDRESS,
    settled: true,
    playerCards: [7, 5, 3],
    dealerCards: [12, 12, 12],
    playerHandRank: 0,
    dealerHandRank: 2,
    payout: 0n,
    result: 'loss',
    timestamp: Date.now() - 18000000,
  },
]

export const mockAchievements: Achievement[] = [
  { id: 1, name: 'First Dice Roll', description: 'Place your first dice bet', imageUrl: '', earned: false },
  { id: 2, name: 'Poker Player', description: 'Play your first poker hand', imageUrl: '', earned: false },
  { id: 3, name: 'High Roller', description: 'Place a bet of 1 ETH or more', imageUrl: '', earned: false },
  { id: 4, name: 'Lucky Streak', description: 'Win 5 bets in a row', imageUrl: '', earned: false },
]

export function generateRandomDiceResult(): number {
  return Math.floor(Math.random() * 100) + 1
}

export function generateRandomCard(): number {
  return Math.floor(Math.random() * 52) + 1
}

export function evaluatePokerHand(cards: number[]): number {
  const ranks = cards.map(c => ((c - 1) % 13) + 1).sort((a, b) => a - b)
  const suits = cards.map(c => Math.floor((c - 1) / 13))
  
  const isFlush = suits[0] === suits[1] && suits[1] === suits[2]
  let isStraight = ranks[0] + 1 === ranks[1] && ranks[1] + 1 === ranks[2]
  // A-2-3 Straight (A=1, 2=2, 3=3 if Ace is 1? Wait, A is usually 14 or 1)
  // In our logic A is 1 (index 0) but rank calculation above makes it 1.
  // Let's align with contract: A is 14.
  // But (c-1)%13 + 1 gives 1 for Ace.
  // If we want A=14, we need to adjust.
  
  // Re-map ranks to match contract (A=14)
  const contractRanks = cards.map(c => {
    const r = ((c - 1) % 13) + 1
    return r === 1 ? 14 : r
  }).sort((a, b) => a - b)
  
  isStraight = contractRanks[0] + 1 === contractRanks[1] && contractRanks[1] + 1 === contractRanks[2]
  if (contractRanks[0] === 2 && contractRanks[1] === 3 && contractRanks[2] === 14) isStraight = true

  if (isFlush && isStraight) return 5 // Straight Flush
  if (contractRanks[0] === contractRanks[1] && contractRanks[1] === contractRanks[2]) return 4 // Three of a Kind
  if (isStraight) return 3 // Straight
  if (isFlush) return 2 // Flush
  if (contractRanks[0] === contractRanks[1] || contractRanks[1] === contractRanks[2]) return 1 // Pair
  return 0 // High Card
}
