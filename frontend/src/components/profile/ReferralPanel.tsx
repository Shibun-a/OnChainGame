import { useState, useEffect } from 'react'
import type { Address } from 'viem'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { useReferralStore } from '@/stores/referralStore'
import { toast } from '@/components/common/Toast'
import { formatEth, formatAddress } from '@/utils/format'

export function ReferralPanel({ address }: { address: Address }) {
  const {
    referrer, referralRewards, isLoading, isClaiming, isSettingReferrer,
    loadReferralInfo, setReferrer, claimRewards,
  } = useReferralStore()

  const [referrerInput, setReferrerInput] = useState('')

  useEffect(() => {
    loadReferralInfo(address)
  }, [address, loadReferralInfo])

  const totalRewards = Array.from(referralRewards.values()).reduce((s, a) => s + a, 0n)

  const handleSetReferrer = async () => {
    if (!referrerInput || !/^0x[a-fA-F0-9]{40}$/.test(referrerInput)) {
      toast('Please enter a valid address', 'error')
      return
    }
    try {
      await setReferrer(address, referrerInput as Address)
      toast('Referrer set successfully!', 'success')
      setReferrerInput('')
    } catch (error) {
      toast((error as Error).message, 'error')
    }
  }

  const handleClaim = async () => {
    try {
      await claimRewards(address)
      toast('Rewards claimed!', 'success')
    } catch (error) {
      toast((error as Error).message, 'error')
    }
  }

  if (isLoading) {
    return <Card><p className="text-gray-500 text-center py-4">Loading referral info...</p></Card>
  }

  return (
    <Card>
      <h2 className="text-xl font-bold mb-4">Referral System</h2>

      {/* Set Referrer Section */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Your Referrer</h3>
        {referrer ? (
          <div className="bg-gray-700/50 rounded-lg px-4 py-3">
            <span className="text-green-400 text-sm mr-2">&#10003;</span>
            <span className="font-mono text-sm">{formatAddress(referrer)}</span>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Enter an address to give them 1% of your bets as referral reward.</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="0x..."
                value={referrerInput}
                onChange={e => setReferrerInput(e.target.value)}
                className="flex-1 bg-gray-700 rounded-lg px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                size="sm"
                onClick={handleSetReferrer}
                loading={isSettingReferrer}
                disabled={!referrerInput}
              >
                Set
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Claim Rewards Section */}
      <div className="pt-4 border-t border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Your Referral Rewards</h3>
        <p className="text-sm text-gray-400 mb-3">Earn 1% of all bets placed by users who set you as referrer.</p>
        <div className="flex items-center justify-between bg-gray-700/50 rounded-lg px-4 py-3 mb-3">
          <span className="text-gray-400">Accumulated Rewards</span>
          <span className="text-xl font-bold text-green-400">{formatEth(totalRewards)} ETH</span>
        </div>
        <Button
          className="w-full"
          onClick={handleClaim}
          disabled={totalRewards === 0n || isClaiming}
          loading={isClaiming}
          variant={totalRewards > 0n ? 'primary' : 'secondary'}
        >
          {totalRewards === 0n ? 'No Rewards to Claim' : 'Claim Rewards'}
        </Button>
      </div>
    </Card>
  )
}
