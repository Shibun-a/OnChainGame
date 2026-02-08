import { useEffect, useState } from 'react'
import type { Address } from 'viem'
import { mainnetClient } from '@/contracts/clients'
import { formatAddress } from '@/utils/format'

export function useEnsName(address: Address | null) {
  const [ensName, setEnsName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!address) {
      setEnsName(null)
      return
    }

    // Check cache (24h TTL)
    const cacheKey = `ens:${address}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        const { name, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          setEnsName(name)
          return
        }
      } catch { /* ignore */ }
    }

    setIsLoading(true)
    mainnetClient.getEnsName({ address })
      .then(name => {
        setEnsName(name)
        if (name) {
          localStorage.setItem(cacheKey, JSON.stringify({ name, timestamp: Date.now() }))
        }
      })
      .catch(() => setEnsName(null))
      .finally(() => setIsLoading(false))
  }, [address])

  const displayName = ensName || (address ? formatAddress(address) : '')

  return { ensName, displayName, isLoading }
}
