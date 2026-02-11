import { useWallet } from '@/hooks/useWallet'
import { useEnsName } from '@/hooks/useEnsName'
import { useBetHistory } from '@/hooks/useBetHistory'
import { Card } from '@/components/common/Card'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import { StatsPanel } from '@/components/profile/StatsPanel'
import { AchievementsList } from '@/components/profile/AchievementsList'
import { ReferralPanel } from '@/components/profile/ReferralPanel'
import { BetHistory } from '@/components/game/BetHistory'
import { useGameStore } from '@/stores/gameStore'
import { formatEth, formatAddress } from '@/utils/format'
import { Button } from '@/components/common/Button'
import { contractClient } from '@/contracts'
import { useState, useEffect } from 'react'
import { toast } from '@/components/common/Toast'
import { publicClient } from '@/contracts/clients'
import { MOCK_ERC20_ADDRESS } from '@/contracts/addresses'

export default function ProfilePage() {
  const { address, isConnected, ethBalance } = useWallet()
  const { ensName } = useEnsName(address)
  const { diceBets, pokerBets } = useGameStore()
  const [isMinting, setIsMinting] = useState(false)
  const mintAmount = 10n * 10n ** 18n
  const [hasClaimed, setHasClaimed] = useState(false)

  // Query on-chain claimed status
  const checkClaimed = async () => {
    if (!address) return
    const ABI = [
      {
        type: 'function',
        name: 'hasClaimed',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'bool' }],
      },
    ] as const
    try {
      const claimed = await publicClient.readContract({
        address: MOCK_ERC20_ADDRESS,
        abi: ABI as any,
        functionName: 'hasClaimed',
        args: [address],
      }) as boolean
      setHasClaimed(claimed)
    } catch {
      setHasClaimed(false)
    }
  }

  // initial and on address change
  useEffect(() => {
    checkClaimed()
  }, [address])

  useBetHistory(address)

  if (!isConnected || !address) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">👤</div>
        <h1 className="text-4xl font-bold mb-4">Profile</h1>
        <p className="text-gray-400 mb-8">Connect your wallet to view your profile</p>
        <div className="flex justify-center"><ConnectButton /></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Profile</h1>

      {/* Player Info */}
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0" />
          <div>
            {ensName && <p className="text-xl font-bold">{ensName}</p>}
            <p className="font-mono text-sm text-gray-400">{formatAddress(address)}</p>
            <p className="text-sm text-gray-300 mt-1">{formatEth(ethBalance)} ETH</p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="mb-6">
        <StatsPanel />
      </div>

      {/* Achievements */}
      <div className="mb-6">
        <AchievementsList address={address} />
      </div>

      {/* Referral */}
      <div className="mb-6">
        <ReferralPanel address={address} />
      </div>

      {/* Test Token Faucet */}
      <Card className="mb-6">
        <h3 className="text-lg font-bold mb-2">Test Token Faucet</h3>
        <p className="text-gray-400 text-sm mb-3">
          Click to claim test ERC-20 tokens for Dice/Poker. Each claim gives {formatEth(mintAmount)}. One claim per address.
        </p>
        <p className="text-xs text-gray-500 mb-3">Status: {hasClaimed ? 'Claimed' : 'Not claimed'}</p>
        <div className="flex items-center gap-3">
          <Button
            onClick={async () => {
              if (!address) return
              if (hasClaimed) {
                toast('Claim limit reached', 'error')
                return
              }
              setIsMinting(true)
              try {
                // @ts-ignore
                await contractClient.mintTestToken(address, mintAmount)
                toast('Claimed successfully', 'success')
                checkClaimed()
              } catch (e) {
                console.error(e)
                toast('Claim failed, please try again later', 'error')
              } finally {
                setIsMinting(false)
              }
            }}
            disabled={isMinting || hasClaimed}
            loading={isMinting}
          >
            {isMinting ? 'Claiming...' : 'Claim Test Tokens'}
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                if (!window.ethereum) {
                  toast('No wallet detected. Please install MetaMask', 'error')
                  return
                }
                const added = await (window.ethereum as any).request({
                  method: 'wallet_watchAsset',
                  params: {
                    type: 'ERC20',
                    options: {
                      address: MOCK_ERC20_ADDRESS,
                      symbol: 'MOCK',
                      decimals: 18,
                    },
                  },
                })
                if (added) toast('Added to MetaMask', 'success')
                else toast('User cancelled adding', 'info')
              } catch (e) {
                console.error(e)
                toast('Adding failed, please try again later', 'error')
              }
            }}
          >
            Add to MetaMask
          </Button>
        </div>
      </Card>

      {/* All Bet History */}
      <div>
        <h2 className="text-2xl font-bold mb-4">All Bet History</h2>
        <BetHistory
          diceBets={Array.from(diceBets.values())}
          pokerBets={Array.from(pokerBets.values())}
          filter="all"
        />
      </div>
    </div>
  )
}
