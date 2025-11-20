/**
 * Journalist Verification Utility
 * Simple verification using wallet signature
 */

const VERIFICATION_MESSAGE_PREFIX = 'VeritasDAO Journalist Verification'
const STORAGE_KEY = 'veritasVerifiedJournalists'

/**
 * Get verification message for signing
 * @param {string} address - Wallet address
 * @returns {string} Message to sign
 */
export function getVerificationMessage(address) {
  const timestamp = Date.now()
  return `${VERIFICATION_MESSAGE_PREFIX}\n\nAddress: ${address}\nTimestamp: ${timestamp}\n\nBy signing this message, you verify that you are a journalist and agree to VeritasDAO's terms of service.`
}

/**
 * Sign message using MetaMask
 * @param {string} address - Wallet address
 * @returns {Promise<{signature: string, message: string}>}
 */
export async function signVerificationMessage(address) {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed')
  }

  const message = getVerificationMessage(address)
  
  try {
    // Request signature from MetaMask
    const signature = await window.ethereum.request({
      method: 'personal_sign',
      params: [message, address],
    })

    return { signature, message }
  } catch (error) {
    if (error.code === 4001) {
      throw new Error('User rejected the signature request')
    }
    throw new Error(`Failed to sign message: ${error.message}`)
  }
}

/**
 * Verify signature (simple verification - just check if signature exists)
 * In production, you might want to verify on-chain or with a backend
 * @param {string} address - Wallet address
 * @param {string} signature - Signature
 * @param {string} message - Original message
 * @returns {boolean}
 */
export function verifySignature(address, signature, message) {
  // Simple verification: just check if signature exists and is valid format
  if (!signature || !signature.startsWith('0x')) {
    return false
  }

  // In a real implementation, you would verify the signature cryptographically
  // For now, we'll just store it and trust the signature exists
  return true
}

/**
 * Save verified journalist to localStorage
 * @param {string} address - Wallet address
 * @param {string} signature - Signature
 * @param {string} message - Original message
 */
export function saveVerifiedJournalist(address, signature, message) {
  try {
    const verified = getVerifiedJournalists()
    verified[address.toLowerCase()] = {
      address: address.toLowerCase(),
      signature,
      message,
      verifiedAt: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(verified))
  } catch (error) {
    console.error('Error saving verified journalist:', error)
    throw error
  }
}

/**
 * Get all verified journalists from localStorage
 * @returns {Object} Object with addresses as keys
 */
export function getVerifiedJournalists() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error('Error reading verified journalists:', error)
    return {}
  }
}

/**
 * Check if an address is verified
 * @param {string} address - Wallet address
 * @returns {boolean}
 */
export function isJournalistVerified(address) {
  if (!address) return false
  const verified = getVerifiedJournalists()
  return !!verified[address.toLowerCase()]
}

/**
 * Get verification info for an address
 * @param {string} address - Wallet address
 * @returns {Object|null} Verification info or null
 */
export function getVerificationInfo(address) {
  if (!address) return null
  const verified = getVerifiedJournalists()
  return verified[address.toLowerCase()] || null
}

/**
 * Remove verification (for testing or if needed)
 * @param {string} address - Wallet address
 */
export function removeVerification(address) {
  try {
    const verified = getVerifiedJournalists()
    delete verified[address.toLowerCase()]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(verified))
  } catch (error) {
    console.error('Error removing verification:', error)
  }
}

