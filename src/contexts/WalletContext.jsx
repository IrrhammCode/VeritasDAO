import React, { createContext, useContext, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { injected, metaMask } from 'wagmi/connectors'
import { ensureSepoliaNetwork } from '../utils/metamaskNetwork'

const WalletContext = createContext(null)

export function WalletProvider({ children }) {
  // Wagmi hooks
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain()

  // Ensure Sepolia network name is correct when connected to Sepolia
  useEffect(() => {
    if (isConnected && chainId === 11155111 && window.ethereum) {
      // Ensure network name is "Sepolia" not "Aeneid"
      ensureSepoliaNetwork().catch(err => {
        console.warn('Could not ensure Sepolia network name:', err)
      })
    }
  }, [isConnected, chainId])

  // Check if any Web3 wallet is available
  const isWalletAvailable = () => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'
  }

  // Connect wallet using wagmi
  const connectWallet = async () => {
    try {
      // Try MetaMask first, then injected
      const metaMaskConnector = connectors.find(c => 
        c.id === 'metaMask' || 
        c.id === 'io.metamask' ||
        (c.name && c.name.toLowerCase().includes('metamask'))
      )
      const injectedConnector = connectors.find(c => c.id === 'injected')
      
      const connector = metaMaskConnector || injectedConnector || connectors[0]
      
      if (!connector) {
        throw new Error('No wallet connector available. Please install MetaMask or another Web3 wallet.')
      }

      // If using MetaMask, ensure Sepolia network is configured correctly
      if (window.ethereum && (metaMaskConnector || injectedConnector)) {
        try {
          // Check current chainId
          const currentChainId = await window.ethereum.request({
            method: 'eth_chainId',
          })
          const sepoliaChainId = '0xaa36a7' // 11155111 in hex
          
          // If already on Sepolia or will be, ensure network name is correct
          if (currentChainId === sepoliaChainId) {
            await ensureSepoliaNetwork()
          }
        } catch (networkError) {
          // If network setup fails, continue with connection anyway
          console.warn('Could not ensure Sepolia network, continuing with connection:', networkError)
        }
      }

      // Wagmi connect will trigger MetaMask popup automatically
      connect({ connector })
      return true
    } catch (err) {
      console.error('Error connecting wallet:', err)
      return false
    }
  }

  // Switch network
  // For Sepolia (11155111), ensure network name is "Sepolia" not "Aeneid"
  const switchNetwork = async (targetChainId) => {
    try {
      // If switching to Sepolia, ensure network configuration is correct
      if (targetChainId === 11155111) {
        try {
          await ensureSepoliaNetwork()
          // After ensuring network, use wagmi switchChain
          switchChain({ chainId: targetChainId })
          return true
        } catch (networkError) {
          console.error('Error ensuring Sepolia network:', networkError)
          // Fallback to wagmi switchChain
          switchChain({ chainId: targetChainId })
          return true
        }
      } else {
        // For other networks, use wagmi switchChain normally
        switchChain({ chainId: targetChainId })
        return true
      }
    } catch (err) {
      console.error('Error switching network:', err)
      return false
    }
  }

  const value = {
    account: address || null,
    chainId: chainId || null,
    isConnecting: isPending || isSwitchingChain,
    error: connectError?.message || null,
    isWalletAvailable: isWalletAvailable(),
    isMetaMaskInstalled: isWalletAvailable(), // Keep for backward compatibility
    connect: connectWallet,
    disconnect,
    switchNetwork,
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return context
}
