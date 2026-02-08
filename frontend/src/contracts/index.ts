import { USE_MOCK_CONTRACTS } from './addresses'
import { mockContractClient } from '@/mocks/mockContractClient'

// Seamless mock/real switching
// When GAME_CORE_ADDRESS is zero address → mock mode
// After deployment, update addresses.ts → real contract mode
export const contractClient = USE_MOCK_CONTRACTS
  ? mockContractClient
  : mockContractClient // TODO: Replace with realContractClient after deployment

export { USE_MOCK_CONTRACTS }
