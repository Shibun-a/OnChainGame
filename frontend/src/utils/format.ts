import { formatEther as viemFormatEther } from 'viem'
import { CARD_VALUES, CARD_SUITS, POKER_HAND_NAMES, PokerHandRank } from '@/contracts/types'

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatEth(value: bigint): string {
  const formatted = viemFormatEther(value)
  const num = parseFloat(formatted)
  const abs = Math.abs(num)
  if (num === 0) return '0'
  if (abs < 0.0001) return num < 0 ? '< -0.0001' : '< 0.0001'
  return num < 0 ? `-${abs.toFixed(4)}` : abs.toFixed(4)
}

export function formatTimestamp(ts: number): string {
  const date = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

export function formatCard(cardValue: number): string {
  const value = CARD_VALUES[(cardValue - 1) % 13]
  const suit = CARD_SUITS[Math.floor((cardValue - 1) / 13) % 4]
  return `${value}${suit}`
}

export function formatCards(cards: number[]): string {
  return cards.map(formatCard).join(' ')
}

export function formatHandRank(rank: number): string {
  return POKER_HAND_NAMES[rank as PokerHandRank] || 'Unknown'
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
