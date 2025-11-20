import { createConfig, http } from 'wagmi'
import { sepolia, mainnet } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

// Define localhost chain manually (not available in wagmi/chains)
const localhost = {
  id: 1337,
  name: 'Localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
  },
}

// Get custom RPC URL from environment (optional)
// If not set, wagmi will use default RPC for the chain
const getSepoliaRpcUrl = () => {
  // Try to get from environment variable (for frontend, use VITE_ prefix)
  const customRpc = import.meta.env.VITE_SEPOLIA_RPC_URL
  if (customRpc) {
    console.log('Using custom Sepolia RPC:', customRpc)
    return customRpc
  }
  // Fallback to default Sepolia RPCs
  return undefined // wagmi will use default
}

// Create custom Sepolia chain with optional custom RPC
// Always ensure name is "Sepolia" (not "Aeneid" or any other name)
// MetaMask uses this chain configuration to display network name in signature requests
const customRpcUrl = getSepoliaRpcUrl()
const customSepolia = {
  ...sepolia,
  id: 11155111, // Explicitly set chain ID
  name: 'Sepolia', // Explicitly set name to Sepolia (MetaMask will use this)
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    ...sepolia.rpcUrls,
    default: {
      ...sepolia.rpcUrls.default,
      http: customRpcUrl ? [customRpcUrl] : sepolia.rpcUrls.default.http,
    },
    public: {
      ...sepolia.rpcUrls.public,
      http: customRpcUrl ? [customRpcUrl] : sepolia.rpcUrls.public?.http || sepolia.rpcUrls.default.http,
    },
  },
  blockExplorers: {
    ...sepolia.blockExplorers,
    default: {
      name: 'Etherscan',
      url: 'https://sepolia.etherscan.io',
    },
  },
  testnet: true, // Explicitly mark as testnet
}

// Get chain ID from environment or default to sepolia
const getDefaultChain = () => {
  const network = import.meta.env.VITE_NETWORK || 'sepolia'
  switch (network) {
    case 'mainnet':
      return mainnet
    case 'localhost':
      return localhost
    case 'sepolia':
    default:
      return customSepolia
  }
}

export const wagmiConfig = createConfig({
  chains: [customSepolia, mainnet, localhost],
  connectors: [
    metaMask(),
    injected(),
  ],
  transports: {
    [customSepolia.id]: customRpcUrl ? http(customRpcUrl) : http(),
    [mainnet.id]: http(),
    [localhost.id]: http(),
  },
})

export const defaultChain = getDefaultChain()

// Export Sepolia chain configuration for direct use
// This ensures MetaMask always uses "Sepolia" name, not "Aeneid"
export const sepoliaChain = customSepolia
