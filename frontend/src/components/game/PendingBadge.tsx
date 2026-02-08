export function PendingBadge({ requestId }: { requestId: bigint }) {
  return (
    <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-xl p-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="h-10 w-10 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
      <h3 className="text-lg font-semibold text-yellow-400 mb-2">
        Waiting for Randomness...
      </h3>
      <p className="text-sm text-gray-400">
        Chainlink VRF is generating your result.
      </p>
      <p className="text-xs text-gray-500 mt-2">
        Request ID: {requestId.toString()}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        Usually takes 30-60 seconds on Sepolia
      </p>
    </div>
  )
}
