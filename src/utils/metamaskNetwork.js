/**
 * Add or update Sepolia network in MetaMask
 * This ensures MetaMask uses "Sepolia" name, not "Aeneid"
 * Using wallet_addEthereumChain will update existing network if chainId matches
 */
export async function ensureSepoliaNetwork() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not installed')
  }

  const chainId = '0xaa36a7' // 11155111 in hex
  const chainIdDecimal = 11155111

  // Sepolia network configuration
  const sepoliaNetwork = {
    chainId: chainId,
    chainName: 'Sepolia',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: [
      import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      'https://rpc.sepolia.org',
      'https://ethereum-sepolia-rpc.publicnode.com',
    ],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
  }

  try {
    // Try to switch to Sepolia first
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainId }],
    })
    console.log('Switched to Sepolia network')
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        // Add the network
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [sepoliaNetwork],
        })
        console.log('Added Sepolia network to MetaMask')
      } catch (addError) {
        console.error('Error adding Sepolia network:', addError)
        throw addError
      }
    } else if (switchError.code === -32002) {
      // Request already pending
      console.log('Network switch request already pending')
    } else {
      // Network exists but might have wrong name
      // Try to update it by adding again (MetaMask will update if chainId matches)
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [sepoliaNetwork],
        })
        console.log('Updated Sepolia network configuration in MetaMask')
      } catch (updateError) {
        console.error('Error updating Sepolia network:', updateError)
        // If update fails, try to switch anyway
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainId }],
          })
        } catch (finalError) {
          console.error('Final switch attempt failed:', finalError)
          throw finalError
        }
      }
    }
  }

  // Verify we're on the correct network
  const currentChainId = await window.ethereum.request({
    method: 'eth_chainId',
  })

  if (currentChainId !== chainId) {
    throw new Error(`Failed to switch to Sepolia. Current chain: ${currentChainId}, expected: ${chainId}`)
  }

  return true
}

