import { ethers } from 'ethers'

/**
 * Check if an address is a valid contract address
 */
export const isValidContractAddress = (address) => {
  if (!address) return false
  if (typeof address !== 'string') return false
  return ethers.isAddress(address) && address !== ethers.ZeroAddress && address.trim() !== ''
}

/**
 * Check if contract exists at address
 */
export const contractExists = async (provider, address) => {
  if (!isValidContractAddress(address)) return false
  try {
    const code = await provider.getCode(address)
    return code !== '0x' && code !== null
  } catch {
    return false
  }
}

/**
 * Safely call a contract function with error handling
 */
export const safeContractCall = async (contract, method, ...args) => {
  if (!contract) {
    throw new Error('Contract not initialized')
  }
  
  try {
    const result = await contract[method](...args)
    return result
  } catch (error) {
    // Handle common errors
    if (error.code === 'BAD_DATA' || error.code === 'CALL_EXCEPTION') {
      throw new Error(`Contract call failed: ${method} - Contract may not be deployed`)
    }
    throw error
  }
}

/**
 * Convert block number to estimated timestamp
 * @param {ethers.Provider} provider - Ethers provider
 * @param {string|number} blockNumber - Block number
 * @returns {Promise<number>} Estimated timestamp in milliseconds
 */
export async function blockNumberToTimestamp(provider, blockNumber) {
  try {
    const block = await provider.getBlock(blockNumber)
    return block.timestamp * 1000 // Convert to milliseconds
  } catch (error) {
    console.error('Error converting block to timestamp:', error)
    // Fallback: estimate based on current block and average block time
    try {
      const currentBlock = await provider.getBlockNumber()
      const currentBlockData = await provider.getBlock('latest')
      const blockDiff = Number(blockNumber) - currentBlock
      const avgBlockTime = 12 // seconds (Ethereum average)
      return (currentBlockData.timestamp + (blockDiff * avgBlockTime)) * 1000
    } catch (fallbackError) {
      // Last resort: use current time
      return Date.now()
    }
  }
}

/**
 * Format time remaining from deadline timestamp
 * @param {number} deadlineTimestamp - Deadline timestamp in milliseconds
 * @returns {string} Formatted time remaining
 */
export function formatTimeRemaining(deadlineTimestamp) {
  try {
    const now = Date.now()
    const remaining = deadlineTimestamp - now

    if (remaining <= 0) return 'Expired'

    const days = Math.floor(remaining / (1000 * 60 * 60 * 24))
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) {
      return `${days} Day${days > 1 ? 's' : ''}, ${hours} Hour${hours !== 1 ? 's' : ''} Remaining`
    } else if (hours > 0) {
      return `${hours} Hour${hours !== 1 ? 's' : ''}, ${minutes} Minute${minutes !== 1 ? 's' : ''} Remaining`
    } else {
      return `${minutes} Minute${minutes !== 1 ? 's' : ''} Remaining`
    }
  } catch (error) {
    return 'Calculating...'
  }
}

/**
 * Check if network is supported
 * @param {number} chainId - Chain ID
 * @returns {boolean} True if network is supported
 */
export function isSupportedNetwork(chainId) {
  if (!chainId) return false
  // Support localhost (1337) and Sepolia (11155111)
  return chainId === 1337 || chainId === 11155111 || chainId === 1
}

/**
 * Get network name from chain ID
 * Always returns "Sepolia Testnet" for chainId 11155111
 * @param {number} chainId - Chain ID
 * @returns {string} Network name
 */
export function getNetworkName(chainId) {
  if (!chainId) return 'Unknown'
  switch (chainId) {
    case 1337:
      return 'Localhost'
    case 11155111:
      return 'Sepolia Testnet' // Always use "Sepolia Testnet" not "Aeneid"
    case 1:
      return 'Mainnet'
    default:
      return `Chain ${chainId}`
  }
}

