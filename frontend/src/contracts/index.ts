import { USE_MOCK_CONTRACTS } from './addresses'
import { mockContractClient } from '@/mocks/mockContractClient'
import { realContractClient } from './realContractClient'

// Seamless mock/real switching
// When GAME_CORE_ADDRESS is zero address → mock mode
// After deployment, update addresses.ts → real contract mode
type ContractClient = typeof mockContractClient

const selectedClient = (USE_MOCK_CONTRACTS
  ? mockContractClient
  : realContractClient) as Partial<ContractClient>

export const contractClient = new Proxy(selectedClient, {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver)
    if (value == null) {
      return () => {
        throw new Error(`contractClient.${String(prop)} is not implemented in current mode`)
      }
    }
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value
  },
}) as ContractClient

export { USE_MOCK_CONTRACTS }
