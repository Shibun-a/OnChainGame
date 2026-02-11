import type { Address } from 'viem'
import { decodeEventLog } from 'viem'
import type { GameConfig, DiceBet, PokerBet, TokenInfo, Achievement } from '@/contracts/types'
import { publicClient, getWalletClient } from '@/contracts/clients'
import { GAME_CORE_ADDRESS, ETH_ADDRESS } from '@/contracts/addresses'
import GameCoreABI from '@/contracts/abi/GameCore.json'
import { mockAchievements } from '@/mocks/mockData'

// Minimal ERC20 ABI for approve / balanceOf / allowance
const erc20Abi = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const

// ---------------------------------------------------------------------------
// RealContractClient – mirrors MockContractClient's public interface
// ---------------------------------------------------------------------------

class RealContractClient {
  // ======================== Read Methods ========================

  async getGameConfig(): Promise<GameConfig> {
    const data = (await publicClient.readContract({
      address: GAME_CORE_ADDRESS,
      abi: GameCoreABI,
      functionName: 'getGameConfig',
    })) as [bigint, bigint, bigint, bigint]

    return {
      houseEdgeBps: Number(data[0]),
      minBet: data[1],
      maxBet: data[2],
      rewardPool: data[3],
    }
  }

  async getSupportedTokens(): Promise<Address[]> {
    return (await publicClient.readContract({
      address: GAME_CORE_ADDRESS,
      abi: GameCoreABI,
      functionName: 'getSupportedTokens',
    })) as Address[]
  }

  async getTokenInfo(token: Address): Promise<TokenInfo> {
    const data = (await publicClient.readContract({
      address: GAME_CORE_ADDRESS,
      abi: GameCoreABI,
      functionName: 'getTokenInfo',
      args: [token],
    })) as [string, number, boolean]

    return {
      address: token,
      symbol: data[0],
      decimals: Number(data[1]),
      isNative: token === ETH_ADDRESS,
    }
  }

  async getTokenBalance(player: Address, token: Address): Promise<bigint> {
    if (token === ETH_ADDRESS) {
      return publicClient.getBalance({ address: player })
    }
    return (await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [player],
    })) as bigint
  }

  async getTokenAllowance(player: Address, token: Address): Promise<bigint> {
    if (token === ETH_ADDRESS) return 0n
    return (await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [player, GAME_CORE_ADDRESS],
    })) as bigint
  }

  async getDiceResult(requestId: bigint): Promise<DiceBet | null> {
    const data = (await publicClient.readContract({
      address: GAME_CORE_ADDRESS,
      abi: GameCoreABI,
      functionName: 'getDiceResult',
      args: [requestId],
    })) as [number, bigint, boolean]

    return {
      requestId,
      player: '0x' as Address,
      amount: 0n,
      token: ETH_ADDRESS,
      chosenNumber: 0,
      multiplier: 0,
      settled: true,
      result: Number(data[0]),
      payout: data[1],
      win: data[2],
      timestamp: Date.now(),
    }
  }

  async getPokerResult(requestId: bigint): Promise<PokerBet | null> {
    const data = (await publicClient.readContract({
      address: GAME_CORE_ADDRESS,
      abi: GameCoreABI,
      functionName: 'getPokerResult',
      args: [requestId],
    })) as [number, number, bigint, boolean]

    return {
      requestId,
      player: '0x' as Address,
      amount: 0n,
      token: ETH_ADDRESS,
      settled: true,
      playerHandRank: Number(data[0]),
      dealerHandRank: Number(data[1]),
      payout: data[2],
      result: data[3] ? 'win' : 'loss',
      timestamp: Date.now(),
    }
  }

  async getDiceBetHistory(player: Address): Promise<DiceBet[]> {
    // 1. Get all DiceBetPlaced events for this player
    const placedLogs = await publicClient.getContractEvents({
      address: GAME_CORE_ADDRESS,
      abi: GameCoreABI,
      eventName: 'DiceBetPlaced',
      args: { player },
      fromBlock: 'earliest',
    })

    // 2. Get all DiceBetSettled events
    const settledLogs = await publicClient.getContractEvents({
      address: GAME_CORE_ADDRESS,
      abi: GameCoreABI,
      eventName: 'DiceBetSettled',
      fromBlock: 'earliest',
    })

    // 3. Build settled map
    const settledMap = new Map<bigint, { result: number; payout: bigint; win: boolean }>()
    for (const log of settledLogs) {
      const args = (log as unknown as { args: { requestId: bigint; result: number; payout: bigint; win: boolean } }).args
      settledMap.set(args.requestId, {
        result: Number(args.result),
        payout: args.payout,
        win: args.win,
      })
    }

    // 4. Merge into DiceBet[]
    return placedLogs
      .map((log) => {
        const args = (log as unknown as { args: {
          requestId: bigint
          player: Address
          amount: bigint
          token: Address
          chosenNumber: number
          multiplier: number
        } }).args
        const settled = settledMap.get(args.requestId)
        return {
          requestId: args.requestId,
          player: args.player,
          amount: args.amount,
          token: args.token,
          chosenNumber: Number(args.chosenNumber),
          multiplier: Number(args.multiplier),
          settled: !!settled,
          result: settled?.result,
          payout: settled?.payout,
          win: settled?.win,
          timestamp: Date.now(), // Could be enriched via block.timestamp
        }
      })
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  async getPokerBetHistory(player: Address): Promise<PokerBet[]> {
    // 1. Get all PokerBetPlaced events for this player
    const placedLogs = await publicClient.getContractEvents({
      address: GAME_CORE_ADDRESS,
      abi: GameCoreABI,
      eventName: 'PokerBetPlaced',
      args: { player },
      fromBlock: 'earliest',
    })

    // 2. Get all PokerBetSettled events
    const settledLogs = await publicClient.getContractEvents({
      address: GAME_CORE_ADDRESS,
      abi: GameCoreABI,
      eventName: 'PokerBetSettled',
      fromBlock: 'earliest',
    })

    // 3. Build settled map
    const settledMap = new Map<
      bigint,
      { playerHand: number; dealerHand: number; payout: bigint; win: boolean }
    >()
    for (const log of settledLogs) {
      const args = (log as unknown as { args: {
        requestId: bigint
        playerHand: number
        dealerHand: number
        payout: bigint
        win: boolean
      } }).args
      settledMap.set(args.requestId, {
        playerHand: Number(args.playerHand),
        dealerHand: Number(args.dealerHand),
        payout: args.payout,
        win: args.win,
      })
    }

    // 4. Merge into PokerBet[]
    return placedLogs
      .map((log) => {
        const args = (log as unknown as { args: {
          requestId: bigint
          player: Address
          amount: bigint
          token: Address
        } }).args
        const settled = settledMap.get(args.requestId)
        let result: 'win' | 'loss' | 'tie' | undefined
        if (settled) {
          result = settled.win ? 'win' : 'loss'
        }
        return {
          requestId: args.requestId,
          player: args.player,
          amount: args.amount,
          token: args.token,
          settled: !!settled,
          playerHandRank: settled?.playerHand,
          dealerHandRank: settled?.dealerHand,
          payout: settled?.payout,
          result,
          timestamp: Date.now(),
        }
      })
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  async getAchievements(player: Address): Promise<Achievement[]> {
    const earnedIds = (await publicClient.readContract({
      address: GAME_CORE_ADDRESS,
      abi: GameCoreABI,
      functionName: 'getAchievements',
      args: [player],
    })) as bigint[]

    const earnedSet = new Set(earnedIds.map((id) => Number(id)))

    return mockAchievements.map((a) => ({
      ...a,
      earned: earnedSet.has(a.id),
      tokenId: earnedSet.has(a.id) ? BigInt(a.id) : undefined,
    }))
  }

  async getReferrer(player: Address): Promise<Address | null> {
    const data = (await publicClient.readContract({
      address: GAME_CORE_ADDRESS,
      abi: GameCoreABI,
      functionName: 'getPlayerStats',
      args: [player],
    })) as [bigint, bigint, bigint, Address]

    const referrer = data[3]
    const zeroAddress = '0x0000000000000000000000000000000000000000'
    return referrer === zeroAddress ? null : referrer
  }

  async getReferralRewards(_player: Address, _token: Address): Promise<bigint> {
    // Not available in current ABI – will be computed from events later
    return 0n
  }

  async getAllReferralRewards(_player: Address): Promise<Map<Address, bigint>> {
    // Not available in current ABI – will be computed from events later
    return new Map()
  }

  // ======================== Write Methods ========================

  async betDice(
    _player: Address,
    chosenNumber: number,
    multiplier: number,
    token: Address,
    amount: bigint,
  ): Promise<bigint> {
    const walletClient = getWalletClient()
    const [account] = await walletClient.getAddresses()

    const isETH = token === ETH_ADDRESS
    const hash = await walletClient.writeContract({
      address: GAME_CORE_ADDRESS,
      abi: GameCoreABI,
      functionName: 'betDice',
      args: [chosenNumber, multiplier, token, amount],
      value: isETH ? amount : 0n,
      account,
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    return this.parseRequestId(receipt.logs, 'DiceBetPlaced')
  }

  async betPoker(_player: Address, token: Address, amount: bigint): Promise<bigint> {
    const walletClient = getWalletClient()
    const [account] = await walletClient.getAddresses()

    const isETH = token === ETH_ADDRESS
    const hash = await walletClient.writeContract({
      address: GAME_CORE_ADDRESS,
      abi: GameCoreABI,
      functionName: 'betPoker',
      args: [0, token, amount], // handChoice fixed at 0
      value: isETH ? amount : 0n,
      account,
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    return this.parseRequestId(receipt.logs, 'PokerBetPlaced')
  }

  async setReferrer(_player: Address, referrer: Address): Promise<void> {
    const walletClient = getWalletClient()
    const [account] = await walletClient.getAddresses()

    const hash = await walletClient.writeContract({
      address: GAME_CORE_ADDRESS,
      abi: GameCoreABI,
      functionName: 'setReferrer',
      args: [referrer],
      account,
    })

    await publicClient.waitForTransactionReceipt({ hash })
  }

  async claimReferralRewards(_player: Address): Promise<void> {
    const walletClient = getWalletClient()
    const [account] = await walletClient.getAddresses()

    const hash = await walletClient.writeContract({
      address: GAME_CORE_ADDRESS,
      abi: GameCoreABI,
      functionName: 'claimReferralRewards',
      args: [],
      account,
    })

    await publicClient.waitForTransactionReceipt({ hash })
  }

  async approveToken(_player: Address, token: Address, amount: bigint): Promise<void> {
    if (token === ETH_ADDRESS) return

    const walletClient = getWalletClient()
    const [account] = await walletClient.getAddresses()

    const hash = await walletClient.writeContract({
      address: token, // ERC20 contract, NOT GameCore
      abi: erc20Abi,
      functionName: 'approve',
      args: [GAME_CORE_ADDRESS, amount],
      account,
    })

    await publicClient.waitForTransactionReceipt({ hash })
  }

  // ======================== Private Helpers ========================

  private parseRequestId(
    logs: readonly { data: `0x${string}`; topics: readonly `0x${string}`[] }[],
    eventName: string,
  ): bigint {
    for (const log of logs) {
      try {
        const event = decodeEventLog({
          abi: GameCoreABI,
          data: log.data,
          topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
        })
        if (event.eventName === eventName) {
          return (event.args as unknown as { requestId: bigint }).requestId
        }
      } catch {
        // Not the target event, skip
      }
    }
    throw new Error(`${eventName} event not found in transaction`)
  }
}

export const realContractClient = new RealContractClient()
