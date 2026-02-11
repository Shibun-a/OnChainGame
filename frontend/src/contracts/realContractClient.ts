import { type Address, type WalletClient, parseAbiItem, decodeEventLog } from 'viem'
import { publicClient, getWalletClient } from './clients'
import { GAME_CORE_ADDRESS } from './addresses'
import { MOCK_ERC20_ADDRESS } from './addresses'
import GameCoreABI from './abi/GameCore.json'
import type { 
  GameConfig, 
  TokenInfo, 
  DiceBet, 
  PokerBet, 
  Achievement,
} from './types'
import { mockAchievements } from '@/mocks/mockData' // Reuse metadata

const ContractABI = GameCoreABI.abi as any

class RealContractClient {
  private async getWallet(): Promise<WalletClient> {
    return getWalletClient()
  }

  private ERC20_ABI = [
    {
      type: 'function',
      name: 'allowance',
      stateMutability: 'view',
      inputs: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
      ],
      outputs: [{ type: 'uint256' }],
    },
    {
      type: 'function',
      name: 'approve',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
      ],
      outputs: [{ type: 'bool' }],
    },
    {
      type: 'function',
      name: 'balanceOf',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ type: 'uint256' }],
    },
  ] as const

  private async ensureERC20Approval(token: Address, owner: Address, amount: bigint): Promise<void> {
    const allowance = await publicClient.readContract({
      address: token,
      abi: this.ERC20_ABI as any,
      functionName: 'allowance',
      args: [owner, GAME_CORE_ADDRESS],
    }) as bigint
    if (allowance < amount) {
      const wallet = await this.getWallet()
      const tx = await wallet.writeContract({
        address: token,
        abi: this.ERC20_ABI as any,
        functionName: 'approve',
        args: [GAME_CORE_ADDRESS, amount],
        account: owner,
        chain: null,
      })
      await publicClient.waitForTransactionReceipt({ hash: tx })
    }
  }

  // ============ Read Methods ============

  async getGameConfig(): Promise<GameConfig> {
    const data = await publicClient.readContract({
      address: GAME_CORE_ADDRESS,
      abi: ContractABI,
      functionName: 'getGameConfig',
    }) as [bigint, bigint, bigint, bigint]

    return {
      houseEdgeBps: Number(data[0]),
      minBet: data[1],
      maxBet: data[2],
      rewardPool: data[3],
    }
  }

  async getSupportedTokens(): Promise<Address[]> {
    return await publicClient.readContract({
      address: GAME_CORE_ADDRESS,
      abi: ContractABI,
      functionName: 'getSupportedTokens',
    }) as Address[]
  }

  async getTokenInfo(token: Address): Promise<TokenInfo> {
    const data = await publicClient.readContract({
      address: GAME_CORE_ADDRESS,
      abi: ContractABI,
      functionName: 'getTokenInfo',
      args: [token],
    }) as [string, number, boolean]

    return {
      address: token,
      symbol: data[0],
      decimals: data[1],
      isNative: data[0] === 'ETH',
    }
  }

  async getDiceResult(requestId: bigint): Promise<DiceBet | null> {
    try {
      // 1. Get static bet info from public mapping
      const betData = await publicClient.readContract({
        address: GAME_CORE_ADDRESS,
        abi: ContractABI,
        functionName: 'diceBets',
        args: [requestId],
      }) as [Address, bigint, Address, number, number, boolean, number, bigint]

      // Struct: player, amount, token, chosenNumber, multiplier, settled, result, payout
      if (betData[0] === '0x0000000000000000000000000000000000000000') return null

      return {
        requestId,
        player: betData[0],
        amount: betData[1],
        token: betData[2],
        chosenNumber: betData[3],
        multiplier: betData[4],
        settled: betData[5],
        result: betData[6],
        payout: betData[7],
        win: betData[7] > 0n,
        timestamp: 0, // Timestamp is hard to get from mapping, usually ignored or fetched from logs
      }
    } catch (e) {
      console.error('Failed to get dice result', e)
      return null
    }
  }

  async getPokerResult(requestId: bigint): Promise<PokerBet | null> {
    try {
      const betData = await publicClient.readContract({
        address: GAME_CORE_ADDRESS,
        abi: ContractABI,
        functionName: 'getFullPokerBet',
        args: [requestId],
      }) as any
      
      if (!betData) return null

      // Handle object return from struct ABI
      if (typeof betData === 'object' && !Array.isArray(betData)) {
          const playerHandRank = betData.playerHandRank
          const dealerHandRank = betData.dealerHandRank
          const payout = betData.payout
          
          let result: 'win' | 'loss' | 'tie' = 'loss'
          if (payout > betData.amount) result = 'win'
          else if (payout === betData.amount && payout > 0n) result = 'tie'
          else result = 'loss'

          return {
            requestId,
            player: betData.player,
            amount: betData.amount,
            token: betData.token,
            settled: betData.settled,
            playerCards: [...betData.playerCards],
            dealerCards: [...betData.dealerCards],
            playerHandRank,
            dealerHandRank,
            payout,
            result,
            timestamp: 0,
          }
      }

      // Fallback for array return
      if (betData[0] === '0x0000000000000000000000000000000000000000') return null

      const playerHandRank = betData[6]
      const dealerHandRank = betData[7]
      const payout = betData[8]
      
      let result: 'win' | 'loss' | 'tie' = 'loss'
      if (payout > betData[1]) result = 'win' // Payout > Amount (approx check)
      else if (payout === betData[1] && payout > 0n) result = 'tie'
      else result = 'loss'

      return {
        requestId,
        player: betData[0],
        amount: betData[1],
        token: betData[2],
        settled: betData[3],
        playerCards: [...betData[4]],
        dealerCards: [...betData[5]],
        playerHandRank,
        dealerHandRank,
        payout,
        result,
        timestamp: 0,
      }
    } catch (e) {
      return null
    }
  }

  async getDiceBetHistory(player: Address): Promise<DiceBet[]> {
    // Reduce range to 1000 blocks to avoid RPC "exceeds limits" (1500) error
    const currentBlock = await publicClient.getBlockNumber()
    const fromBlock = currentBlock - 1000n > 0n ? currentBlock - 1000n : 0n

    // Fetch logs to rebuild history
    try {
      const logs = await publicClient.getLogs({
        address: GAME_CORE_ADDRESS,
        event: parseAbiItem('event DiceBetPlaced(uint256 indexed requestId, address indexed player, uint256 amount, address token, uint8 chosenNumber, uint8 multiplier)'),
        args: { player },
        fromBlock: fromBlock,
      })

      if (logs.length === 0) return []

      // Batch fetch current status
      const calls = logs.map(log => ({
        address: GAME_CORE_ADDRESS,
        abi: ContractABI,
        functionName: 'diceBets',
        args: [log.args.requestId!]
      }))

      const betDataResults = await publicClient.multicall({ contracts: calls })

      const results = await Promise.all(logs.map(async (log, index) => {
        const { requestId, amount, token, chosenNumber, multiplier } = log.args
        const block = await publicClient.getBlock({ blockNumber: log.blockNumber })
        const betData = betDataResults[index].result as [Address, bigint, Address, number, number, boolean, number, bigint]
        
        if (!betData) return null // Should not happen

        return {
          requestId: requestId!,
          player: player,
          amount: amount!,
          token: token!,
          chosenNumber: chosenNumber!,
          multiplier: multiplier!,
          settled: betData[5],
          result: betData[6],
          payout: betData[7],
          win: betData[7] > 0n,
          timestamp: Number(block.timestamp) * 1000
        }
      }))

      return results.filter((b) => b !== null).sort((a, b) => b!.timestamp - a!.timestamp) as DiceBet[]
    } catch (error) {
      console.error('Failed to fetch dice bet history:', error)
      return []
    }
  }

  async getPokerBetHistory(player: Address): Promise<PokerBet[]> {
    try {
      // Reduce range to 1000 blocks to avoid RPC "exceeds limits" (1500) error
      const currentBlock = await publicClient.getBlockNumber()
      const fromBlock = currentBlock - 1000n > 0n ? currentBlock - 1000n : 0n

      const logs = await publicClient.getLogs({
        address: GAME_CORE_ADDRESS,
        event: parseAbiItem('event PokerBetPlaced(uint256 indexed requestId, address indexed player, uint256 amount, address token, uint8 handChoice)'),
        args: { player },
        fromBlock: fromBlock,
      })

      if (logs.length === 0) return []

      const calls = logs.map(log => ({
        address: GAME_CORE_ADDRESS,
        abi: ContractABI,
        functionName: 'getFullPokerBet',
        args: [log.args.requestId!]
      }))

      const betDataResults = await publicClient.multicall({ contracts: calls })

      const results = await Promise.all(logs.map(async (log, index) => {
        const { requestId, amount, token } = log.args
        const block = await publicClient.getBlock({ blockNumber: log.blockNumber })
        // Note: When ABI uses struct, viem returns an object, not an array.
        // We cast to 'any' here to handle both array (old behavior) and object (new behavior) cases safely.
        const betData = betDataResults[index].result as any

        if (!betData) return null

        // Handle object return from struct ABI
        if (typeof betData === 'object' && !Array.isArray(betData)) {
            const playerHandRank = betData.playerHandRank
            const dealerHandRank = betData.dealerHandRank
            const payout = betData.payout
            
            let result: 'win' | 'loss' | 'tie' = 'loss'
            if (payout > betData.amount) result = 'win'
            else if (payout === betData.amount && payout > 0n) result = 'tie'
            else result = 'loss'

            return {
              requestId: requestId!,
              player: player,
              amount: amount!,
              token: token!,
              settled: betData.settled,
              playerCards: [...betData.playerCards],
              dealerCards: [...betData.dealerCards],
              playerHandRank,
              dealerHandRank,
              payout,
              result,
              timestamp: Number(block.timestamp) * 1000
            }
        }
        
        // Fallback for array return (if ABI changes back or different viem config)
        const playerHandRank = betData[6]
        const dealerHandRank = betData[7]
        const payout = betData[8]
        
        let result: 'win' | 'loss' | 'tie' = 'loss'
        if (payout > betData[1]) result = 'win'
        else if (payout === betData[1] && payout > 0n) result = 'tie'
        else result = 'loss'

        return {
          requestId: requestId!,
          player: player,
          amount: amount!,
          token: token!,
          settled: betData[3],
          playerCards: [...betData[4]],
          dealerCards: [...betData[5]],
          playerHandRank,
          dealerHandRank,
          payout,
          result,
          timestamp: Number(block.timestamp) * 1000
        }
      }))

      return results.filter((b) => b !== null).sort((a, b) => b!.timestamp - a!.timestamp) as PokerBet[]
    } catch (error) {
      console.error('Failed to fetch poker bet history:', error)
      return []
    }
  }

  async getAchievements(player: Address): Promise<Achievement[]> {
    const earnedIds = await publicClient.readContract({
      address: GAME_CORE_ADDRESS,
      abi: ContractABI,
      functionName: 'getAchievements',
      args: [player],
    }) as bigint[]

    const earnedSet = new Set(earnedIds.map(id => Number(id)))

    return mockAchievements.map(a => ({
      ...a,
      earned: earnedSet.has(a.id),
      tokenId: earnedSet.has(a.id) ? BigInt(a.id) : undefined, // Simplification: tokenID = achievementID
    }))
  }

  async getReferrer(player: Address): Promise<Address | null> {
    const data = await publicClient.readContract({
      address: GAME_CORE_ADDRESS,
      abi: ContractABI,
      functionName: 'getPlayerStats',
      args: [player],
    }) as [bigint, bigint, bigint, Address]
    
    const referrer = data[3]
    return referrer === '0x0000000000000000000000000000000000000000' ? null : referrer
  }

  async getAllReferralRewards(player: Address): Promise<Map<Address, bigint>> {
    // Note: The contract doesn't have a helper to get ALL rewards.
    // It has `referralRewards(referrer, token)`.
    // We need to know which tokens are supported.
    const tokens = await this.getSupportedTokens()
    const rewards = new Map<Address, bigint>()
    
    await Promise.all(tokens.map(async (token) => {
      const amount = await publicClient.readContract({
        address: GAME_CORE_ADDRESS,
        abi: ContractABI,
        functionName: 'referralRewards',
        args: [player, token],
      }) as bigint
      if (amount > 0n) rewards.set(token, amount)
    }))
    
    return rewards
  }

  // ============ Write Methods ============

  async betDice(
    player: Address,
    chosenNumber: number,
    multiplier: number,
    token: Address,
    amount: bigint
  ): Promise<bigint> {
    const wallet = await this.getWallet()
    const isEth = token === '0x0000000000000000000000000000000000000000'

    if (!isEth) {
      await this.ensureERC20Approval(token, player, amount)
    }

    const hash = await wallet.writeContract({
      address: GAME_CORE_ADDRESS,
      abi: ContractABI,
      functionName: 'betDice',
      args: [chosenNumber, multiplier, token, amount],
      value: isEth ? amount : 0n,
      account: player,
      chain: null,
      gas: 500000n
    })

    // Wait for tx and extract requestId from event
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === GAME_CORE_ADDRESS.toLowerCase()) {
        try {
          const event = decodeEventLog({
            abi: ContractABI,
            data: log.data,
            topics: log.topics, 
          })
          if ((event as any).eventName === 'DiceBetPlaced') {
             // @ts-ignore
            return event.args.requestId
          }
        } catch {}
      }
    }

    throw new Error('Failed to retrieve request ID')
  }

  async betPoker(player: Address, token: Address, amount: bigint): Promise<bigint> {
    const wallet = await this.getWallet()
    const isEth = token === '0x0000000000000000000000000000000000000000'

    if (!isEth) {
      await this.ensureERC20Approval(token, player, amount)
    }

    const hash = await wallet.writeContract({
      address: GAME_CORE_ADDRESS,
      abi: ContractABI,
      functionName: 'betPoker',
      args: [0, token, amount], // HandChoice is unused in current contract logic
      value: isEth ? amount : 0n,
      account: player,
      chain: null,
      gas: 500000n
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === GAME_CORE_ADDRESS.toLowerCase()) {
        try {
          const event = decodeEventLog({
            abi: ContractABI,
            data: log.data,
            topics: log.topics, 
          })
          if ((event as any).eventName === 'PokerBetPlaced') {
            // @ts-ignore
            return event.args.requestId
          }
        } catch {}
      }
    }
    throw new Error('Failed to retrieve request ID')
  }

  async mintTestToken(player: Address, _amount: bigint): Promise<void> {
    const wallet = await this.getWallet()
    const ERC20_ABI = [
      {
        type: 'function',
        name: 'claim',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
      },
    ] as const
    const hash = await wallet.writeContract({
      address: MOCK_ERC20_ADDRESS,
      abi: ERC20_ABI as any,
      functionName: 'claim',
      args: [],
      account: player,
      chain: null,
    })
    await publicClient.waitForTransactionReceipt({ hash })
  }

  async setReferrer(player: Address, referrer: Address): Promise<void> {
    const wallet = await this.getWallet()
    const hash = await wallet.writeContract({
      address: GAME_CORE_ADDRESS,
      abi: ContractABI,
      functionName: 'setReferrer',
      args: [referrer],
      account: player,
      chain: null,
    })
    await publicClient.waitForTransactionReceipt({ hash })
  }

  async claimReferralRewards(player: Address): Promise<void> {
    const wallet = await this.getWallet()
    const hash = await wallet.writeContract({
      address: GAME_CORE_ADDRESS,
      abi: ContractABI,
      functionName: 'claimReferralRewards',
      args: [],
      account: player,
      chain: null,
    })
    await publicClient.waitForTransactionReceipt({ hash })
  }
}

export const realContractClient = new RealContractClient()
