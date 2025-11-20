import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './WalletModal.css'

function WalletModal({ isOpen, onClose, onConnect }) {
  const [installedWallets, setInstalledWallets] = useState([])
  const [detectedProvider, setDetectedProvider] = useState(null)

  // Detect installed wallets
  useEffect(() => {
    if (!isOpen) return

    const wallets = []
    let provider = null

    // Check for window.ethereum
    if (typeof window !== 'undefined' && window.ethereum) {
      provider = window.ethereum
      
      // Check for specific wallet providers
      if (window.ethereum.isMetaMask) {
        wallets.push({
          id: 'metamask',
          name: 'MetaMask',
          icon: '🦊',
          logo: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
          installed: true
        })
      }
      
      if (window.ethereum.isCoinbaseWallet) {
        wallets.push({
          id: 'coinbase',
          name: 'Coinbase Wallet',
          icon: '🔵',
          logo: null,
          installed: true
        })
      }
      
      if (window.ethereum.isBraveWallet) {
        wallets.push({
          id: 'brave',
          name: 'Brave Wallet',
          icon: '🦁',
          logo: null,
          installed: true
        })
      }

      // Generic Web3 provider (if no specific wallet detected)
      if (wallets.length === 0 && provider) {
        wallets.push({
          id: 'web3',
          name: 'Web3 Wallet',
          icon: '🔷',
          logo: null,
          installed: true
        })
      }
    }

    setInstalledWallets(wallets)
    setDetectedProvider(provider)
  }, [isOpen])

  const popularWallets = useMemo(() => [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      description: 'The most popular wallet',
      link: 'https://metamask.io/download/',
      installed: installedWallets.some(w => w.id === 'metamask') || (detectedProvider && detectedProvider.isMetaMask)
    },
    {
      id: 'rainbow',
      name: 'Rainbow',
      icon: '🌈',
      description: 'Beautiful wallet experience',
      link: 'https://rainbow.me/',
      installed: false
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      icon: '🔵',
      description: 'Secure wallet by Coinbase',
      link: 'https://www.coinbase.com/wallet',
      installed: installedWallets.some(w => w.id === 'coinbase') || (detectedProvider && detectedProvider.isCoinbaseWallet)
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Connect any wallet',
      link: 'https://walletconnect.com/',
      installed: false
    }
  ], [installedWallets, detectedProvider])

  const handleWalletClick = async (wallet) => {
    if (wallet.installed && detectedProvider) {
      // Directly trigger wallet connection - approval happens in MetaMask popup
      try {
        await onConnect()
        // Modal will close automatically when account is set in parent component
      } catch (error) {
        // Error handling is done in parent component
        console.error('Error connecting wallet:', error)
        // Don't close modal on error - let user try again
      }
    } else if (wallet.link) {
      // Open wallet download page
      window.open(wallet.link, '_blank', 'noopener,noreferrer')
      // Don't close modal - let user install wallet first
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="wallet-modal-overlay" onClick={onClose}>
        <motion.div
          className="wallet-modal"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="wallet-modal-close" onClick={onClose}>
            ×
          </button>

          <div className="wallet-modal-content">
            {/* Left Section - Wallet List */}
            <div className="wallet-modal-left">
              <h2 className="wallet-modal-title">Connect a Wallet</h2>

              {/* Installed Wallets */}
              {installedWallets.length > 0 && (
                <div className="wallet-section">
                  <h3 className="wallet-section-title">Installed</h3>
                  <div className="wallet-list">
                    {installedWallets.map((wallet) => (
                      <motion.button
                        key={wallet.id}
                        className="wallet-item installed"
                        onClick={() => handleWalletClick(wallet)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="wallet-icon">
                          {wallet.logo ? (
                            <img src={wallet.logo} alt={wallet.name} />
                          ) : (
                            <span className="wallet-emoji">{wallet.icon}</span>
                          )}
                        </div>
                        <div className="wallet-info">
                          <span className="wallet-name">{wallet.name}</span>
                        </div>
                        <span className="wallet-badge installed-badge">Installed</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Wallets */}
              <div className="wallet-section">
                <h3 className="wallet-section-title">Popular</h3>
                <div className="wallet-list">
                  {popularWallets.map((wallet) => (
                    <motion.button
                      key={wallet.id}
                      className={`wallet-item ${wallet.installed ? 'installed' : ''}`}
                      onClick={() => handleWalletClick(wallet)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="wallet-icon">
                        <span className="wallet-emoji">{wallet.icon}</span>
                      </div>
                      <div className="wallet-info">
                        <span className="wallet-name">{wallet.name}</span>
                        <span className="wallet-description">{wallet.description}</span>
                      </div>
                      {wallet.installed && (
                        <span className="wallet-badge installed-badge">Installed</span>
                      )}
                      {wallet.id === 'metamask' && wallet.installed && (
                        <span className="wallet-badge recent-badge">Recent</span>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Section - Education */}
            <div className="wallet-modal-right">
              <h2 className="wallet-modal-title">What is a Wallet?</h2>

              <div className="wallet-education">
                <div className="education-item">
                  <div className="education-icon">
                    <div className="asset-grid">
                      <span>🪙</span>
                      <span>🌈</span>
                      <span>💎</span>
                      <span>🔑</span>
                      <span>⭐</span>
                      <span>🟣</span>
                    </div>
                  </div>
                  <h3 className="education-title">A Home for your Digital Assets</h3>
                  <p className="education-text">
                    Wallets are used to send, receive, store, and display digital assets like Ethereum and NFTs.
                  </p>
                </div>

                <div className="education-item">
                  <div className="education-icon">
                    <span className="keyhole-icon">🔐</span>
                  </div>
                  <h3 className="education-title">A New Way to Log In</h3>
                  <p className="education-text">
                    Instead of creating new accounts and passwords on every website, just connect your wallet.
                  </p>
                </div>
              </div>

              <div className="wallet-actions">
                <motion.a
                  href="https://ethereum.org/en/wallets/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wallet-button primary"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Get a Wallet
                </motion.a>
                <a
                  href="https://ethereum.org/en/wallets/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wallet-link"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default WalletModal

