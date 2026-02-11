import type { Address } from 'viem'
import type { GameConfig, DiceBet, PokerBet, TokenInfo, Achievement } from '@/contracts/types'
import { ETH_ADDRESS } from '@/contracts/addresses'
import {
  mockGameConfig,
  mockDiceBetHistory,
  mockPokerBetHistory,
  mockAchievements,
  generateRandomCard,
  generateRandomDiceResult,
  evaluatePokerHand,
  MOCK_ERC20_ADDRESS,
} from './mockData'

const STORAGE_KEY_DICE = 'mock:diceBets'
const STORAGE_KEY_POKER = 'mock:pokerBets'

function replacer(_key: string, value: any) {
  if (typeof value === 'bigint') {
    return { __type: 'bigint', value: value.toString() }
  }
  return value
}

function reviver(_key: string, value: any) {
  if (value && typeof value === 'object' && value.__type === 'bigint') {
    return BigInt(value.value)
  }
  return value
}

class MockContractClient {
  private diceBets = new Map<bigint, DiceBet>()
  private pokerBets = new Map<bigint, PokerBet>()
  private nextRequestId = 100n
  private playerAchievements = new Map<string, Set<number>>()
  private referrers = new Map<string, Address>()
  private referralRewards = new Map<string, Map<string, bigint>>()
  private erc20Balances = new Map<string, Map<string, bigint>>()
  private erc20Allowances = new Map<string, Map<string, bigint>>()

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    try {
      const diceData = localStorage.getItem(STORAGE_KEY_DICE)
      if (diceData) {
        const bets = JSON.parse(diceData, reviver) as DiceBet[]
        bets.forEach(b => this.diceBets.set(b.requestId, b))
      } else {
        mockDiceBetHistory.forEach(bet => this.diceBets.set(bet.requestId, bet))
      }

      const pokerData = localStorage.getItem(STORAGE_KEY_POKER)
      if (pokerData) {
        const bets = JSON.parse(pokerData, reviver) as PokerBet[]
        bets.forEach(b => this.pokerBets.set(b.requestId, b))
      } else {
        mockPokerBetHistory.forEach(bet => this.pokerBets.set(bet.requestId, bet))
      }
      
      // Update nextRequestId to avoid collision
      let maxId = 0n
      for (const id of this.diceBets.keys()) if (id > maxId) maxId = id
      for (const id of this.pokerBets.keys()) if (id > maxId) maxId = id
      if (maxId >= 100n) this.nextRequestId = maxId + 1n

    } catch (e) {
      console.error('Failed to load mock data from storage', e)
      // Fallback
      mockDiceBetHistory.forEach(bet => this.diceBets.set(bet.requestId, bet))
      mockPokerBetHistory.forEach(bet => this.pokerBets.set(bet.requestId, bet))
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_DICE, JSON.stringify(Array.from(this.diceBets.values()), replacer))
      localStorage.setItem(STORAGE_KEY_POKER, JSON.stringify(Array.from(this.pokerBets.values()), replacer))
    } catch (e) {
      console.error('Failed to save mock data to storage', e)
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private emit(eventName: string, data: unknown) {
    window.dispatchEvent(new CustomEvent(`mock:${eventName}`, { detail: data }))
  }

  private getOrCreateTokenMap(
    source: Map<string, Map<string, bigint>>,
    player: Address,
  ): Map<string, bigint> {
    const key = player.toLowerCase()
    if (!source.has(key)) source.set(key, new Map())
    return source.get(key)!
  }

  private getOrCreateErc20Balance(player: Address, token: Address): bigint {
    const balances = this.getOrCreateTokenMap(this.erc20Balances, player)
    const tokenKey = token.toLowerCase()
    if (!balances.has(tokenKey)) {
      balances.set(tokenKey, 1000n * 10n ** 18n)
    }
    return balances.get(tokenKey) ?? 0n
  }

  private setErc20Balance(player: Address, token: Address, amount: bigint) {
    const balances = this.getOrCreateTokenMap(this.erc20Balances, player)
    balances.set(token.toLowerCase(), amount)
  }

  // ============ Read Methods ============

  async getGameConfig(): Promise<GameConfig> {
    await this.delay(100)
    return { ...mockGameConfig }
  }

  async getSupportedTokens(): Promise<Address[]> {
    await this.delay(100)
    return [ETH_ADDRESS, MOCK_ERC20_ADDRESS]
  }

  async getTokenInfo(token: Address): Promise<TokenInfo> {
    await this.delay(100)
    if (token === ETH_ADDRESS) {
      return { address: ETH_ADDRESS, symbol: 'ETH', decimals: 18, isNative: true }
    }
    return { address: token, symbol: 'MOCK', decimals: 18, isNative: false }
  }

  async getTokenBalance(player: Address, token: Address): Promise<bigint> {
    await this.delay(80)
    if (token === ETH_ADDRESS) return 0n
    return this.getOrCreateErc20Balance(player, token)
  }

  async getTokenAllowance(player: Address, token: Address): Promise<bigint> {
    await this.delay(80)
    if (token === ETH_ADDRESS) return 0n
    const allowances = this.getOrCreateTokenMap(this.erc20Allowances, player)
    return allowances.get(token.toLowerCase()) ?? 0n
  }

  async getDiceResult(requestId: bigint): Promise<DiceBet | null> {
    await this.delay(50)
    return this.diceBets.get(requestId) ?? null
  }

  async getPokerResult(requestId: bigint): Promise<PokerBet | null> {
    await this.delay(50)
    return this.pokerBets.get(requestId) ?? null
  }

  async getDiceBetHistory(player: Address): Promise<DiceBet[]> {
    await this.delay(150)
    const key = player.toLowerCase()
    return Array.from(this.diceBets.values())
      .filter(b => b.player.toLowerCase() === key)
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  async getPokerBetHistory(player: Address): Promise<PokerBet[]> {
    await this.delay(150)
    const key = player.toLowerCase()
    return Array.from(this.pokerBets.values())
      .filter(b => b.player.toLowerCase() === key)
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  async getAchievements(player: Address): Promise<Achievement[]> {
    await this.delay(100)
    const earned = this.playerAchievements.get(player.toLowerCase()) ?? new Set()
    return mockAchievements.map(a => ({
      ...a,
      earned: earned.has(a.id),
      tokenId: earned.has(a.id) ? BigInt(a.id) : undefined,
    }))
  }

  async getReferrer(player: Address): Promise<Address | null> {
    await this.delay(50)
    return this.referrers.get(player.toLowerCase()) ?? null
  }

  async getReferralRewards(player: Address, token: Address): Promise<bigint> {
    await this.delay(50)
    return this.referralRewards.get(player.toLowerCase())?.get(token.toLowerCase()) ?? 0n
  }

  async getAllReferralRewards(player: Address): Promise<Map<Address, bigint>> {
    await this.delay(100)
    const rewards = this.referralRewards.get(player.toLowerCase())
    if (!rewards) return new Map()
    const result = new Map<Address, bigint>()
    for (const [token, amount] of rewards.entries()) {
      result.set(token as Address, amount)
    }
    return result
  }

  // ============ Write Methods ============

  async betDice(
    player: Address,
    chosenNumber: number,
    multiplier: number,
    token: Address,
    amount: bigint,
  ): Promise<bigint> {
    await this.delay(400)

    if (token !== ETH_ADDRESS) {
      const balance = this.getOrCreateErc20Balance(player, token)
      if (balance < amount) throw new Error('Insufficient token balance')

      const allowances = this.getOrCreateTokenMap(this.erc20Allowances, player)
      const tokenKey = token.toLowerCase()
      const allowance = allowances.get(tokenKey) ?? 0n
      if (allowance < amount) throw new Error('Insufficient allowance. Please approve token first.')

      this.setErc20Balance(player, token, balance - amount)
      allowances.set(tokenKey, allowance - amount)
    }

    const requestId = this.nextRequestId++
    const bet: DiceBet = {
      requestId, player, amount, token, chosenNumber, multiplier,
      settled: false, timestamp: Date.now(),
    }
    this.diceBets.set(requestId, bet)

    // Achievement: first dice bet
    const key = player.toLowerCase()
    if (!this.playerAchievements.has(key)) this.playerAchievements.set(key, new Set())
    const earned = this.playerAchievements.get(key)!
    if (!earned.has(1)) {
      earned.add(1)
      this.emit('AchievementMinted', { player, achievementId: 1, tokenId: 1n })
    }

    this.processReferral(player, token, amount)

    this.emit('DiceBetPlaced', { requestId, player, amount, token, chosenNumber, multiplier })

    // Simulate VRF callback (3-5 seconds)
    setTimeout(() => this.settleDice(requestId), 3000 + Math.random() * 2000)

    return requestId
  }

  async betPoker(player: Address, token: Address, amount: bigint): Promise<bigint> {
    await this.delay(400)

    if (token !== ETH_ADDRESS) {
      const balance = this.getOrCreateErc20Balance(player, token)
      if (balance < amount) throw new Error('Insufficient token balance')

      const allowances = this.getOrCreateTokenMap(this.erc20Allowances, player)
      const tokenKey = token.toLowerCase()
      const allowance = allowances.get(tokenKey) ?? 0n
      if (allowance < amount) throw new Error('Insufficient allowance. Please approve token first.')

      this.setErc20Balance(player, token, balance - amount)
      allowances.set(tokenKey, allowance - amount)
    }

    const requestId = this.nextRequestId++
    const bet: PokerBet = {
      requestId, player, amount, token,
      settled: false, timestamp: Date.now(),
    }
    this.pokerBets.set(requestId, bet)
    this.saveToStorage()

    // Achievement: first poker bet
    const key = player.toLowerCase()
    if (!this.playerAchievements.has(key)) this.playerAchievements.set(key, new Set())
    const earned = this.playerAchievements.get(key)!
    if (!earned.has(2)) {
      earned.add(2)
      this.emit('AchievementMinted', { player, achievementId: 2, tokenId: 2n })
    }

    this.processReferral(player, token, amount)

    this.emit('PokerBetPlaced', { requestId, player, amount, token, handChoice: 0 })

    setTimeout(() => this.settlePoker(requestId), 3000 + Math.random() * 2000)

    return requestId
  }

  async setReferrer(player: Address, referrer: Address): Promise<void> {
    await this.delay(300)
    const key = player.toLowerCase()
    if (this.referrers.has(key)) throw new Error('Referrer already set')
    if (player.toLowerCase() === referrer.toLowerCase()) throw new Error('Cannot refer yourself')
    this.referrers.set(key, referrer)
  }

  async claimReferralRewards(player: Address): Promise<void> {
    await this.delay(400)
    const key = player.toLowerCase()
    const rewards = this.referralRewards.get(key)
    if (!rewards || rewards.size === 0) throw new Error('No rewards to claim')

    for (const [token, amount] of rewards.entries()) {
      if ((token as Address) !== ETH_ADDRESS) {
        const balance = this.getOrCreateErc20Balance(player, token as Address)
        this.setErc20Balance(player, token as Address, balance + amount)
      }
      this.emit('ReferralRewardPaid', { player, token, amount })
    }
    this.referralRewards.delete(key)
  }

  async approveToken(player: Address, token: Address, amount: bigint): Promise<void> {
    await this.delay(300)
    if (token === ETH_ADDRESS) return
    const allowances = this.getOrCreateTokenMap(this.erc20Allowances, player)
    allowances.set(token.toLowerCase(), amount)
  }

  // ============ Private ============

  private settleDice(requestId: bigint) {
    const bet = this.diceBets.get(requestId)
    if (!bet || bet.settled) return

    const result = generateRandomDiceResult()
    const threshold = bet.multiplier === 2 ? 50 : bet.multiplier === 5 ? 80 : 90
    const win = result > threshold
    const payout = win
      ? (bet.amount * BigInt(bet.multiplier) * 98n) / 100n
      : 0n

    if (payout > 0n && bet.token !== ETH_ADDRESS) {
      const balance = this.getOrCreateErc20Balance(bet.player, bet.token)
      this.setErc20Balance(bet.player, bet.token, balance + payout)
    }

    Object.assign(bet, { settled: true, result, payout, win })
    this.saveToStorage()
    this.emit('DiceBetSettled', { requestId, result, payout, win })
  }

  private settlePoker(requestId: bigint) {
    const bet = this.pokerBets.get(requestId)
    if (!bet || bet.settled) return

    const playerCards = [generateRandomCard(), generateRandomCard(), generateRandomCard()]
    const dealerCards = [generateRandomCard(), generateRandomCard(), generateRandomCard()]
    const playerHandRank = evaluatePokerHand(playerCards)
    const dealerHandRank = evaluatePokerHand(dealerCards)

    let result: 'win' | 'loss' | 'tie'
    let payout: bigint

    if (playerHandRank > dealerHandRank) {
      result = 'win'
      payout = (bet.amount * 2n * 98n) / 100n
    } else if (playerHandRank < dealerHandRank) {
      result = 'loss'
      payout = 0n
    } else {
      result = 'tie'
      payout = bet.amount
    }

    if (payout > 0n && bet.token !== ETH_ADDRESS) {
      const balance = this.getOrCreateErc20Balance(bet.player, bet.token)
      this.setErc20Balance(bet.player, bet.token, balance + payout)
    }

    Object.assign(bet, { settled: true, playerCards, dealerCards, playerHandRank, dealerHandRank, payout, result })
    this.saveToStorage()
    this.emit('PokerBetSettled', { requestId, playerCards, dealerCards, playerHandRank, dealerHandRank, payout, win: result !== 'loss' })
  }

  private processReferral(player: Address, token: Address, amount: bigint) {
    const referrer = this.referrers.get(player.toLowerCase())
    if (!referrer) return

    const reward = amount / 100n
    const rKey = referrer.toLowerCase()
    if (!this.referralRewards.has(rKey)) this.referralRewards.set(rKey, new Map())
    const rewards = this.referralRewards.get(rKey)!
    const tKey = token.toLowerCase()
    rewards.set(tKey, (rewards.get(tKey) ?? 0n) + reward)
  }
}

export const mockContractClient = new MockContractClient()
