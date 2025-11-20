import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useWallet } from '../contexts/WalletContext'
import { useToast } from '../contexts/ToastContext'
import WalletModal from './WalletModal'
import './LandingPage.css'

function LandingPage() {
  const { connect, isWalletAvailable, isConnecting, error, account } = useWallet()
  const { success, error: showError } = useToast()
  const [showWalletModal, setShowWalletModal] = useState(false)


  const handleConnectClick = (e) => {
    e?.preventDefault()
    e?.stopPropagation()
    setShowWalletModal(true)
  }

  const handleWalletConnect = async () => {
    try {
      console.log('Starting wallet connection...')
      const result = await connect()
      console.log('Connect result:', result)
      
      // Wagmi connect is async but doesn't return account immediately
      // Account will be updated via wagmi hooks automatically
      // Modal will close when account is set (handled by useEffect below)
    } catch (err) {
      console.error('Error in handleWalletConnect:', err)
      if (err.code === 4001) {
        showError('User rejected the connection request')
      } else {
        showError(err.message || 'Failed to connect wallet')
      }
    }
  }

  // Close modal and show success when wallet is connected
  useEffect(() => {
    if (account) {
      success('Wallet connected successfully! Redirecting to dashboard...')
      setShowWalletModal(false)
    }
  }, [account, success])
  
  // Show error if connection fails
  useEffect(() => {
    if (error) {
      showError(error)
    }
  }, [error, showError])

  return (
    <div className="landing-page">
      {/* Simple Top Bar - Only Logo and Connect Wallet */}
      <nav className="landing-navbar">
        <div className="landing-navbar-container">
          <div className="landing-logo">
            <img src="/veritasdao.png" alt="VeritasDAO" className="logo-image" />
            <span className="logo-text">VeritasDAO</span>
          </div>

          <div className="landing-nav-wallet" style={{ display: 'flex', alignItems: 'center' }}>
            {!isWalletAvailable ? (
              <a
                href="https://ethereum.org/en/wallets/"
                target="_blank"
                rel="noopener noreferrer"
                className="landing-connect-button"
                style={{ display: 'block', visibility: 'visible', opacity: 1 }}
              >
                Install Wallet
              </a>
            ) : (
              <button
                className="landing-connect-button"
                onClick={handleConnectClick}
                style={{ display: 'block', visibility: 'visible', opacity: 1 }}
                type="button"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - Only Connect Wallet Focus */}
      <section className="landing-hero">
        <div className="landing-container">
          <motion.div
            className="landing-hero-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.h1
              className="hero-headline"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              Journalism That Can't Be Silenced.
            </motion.h1>
            
            <motion.p
              className="hero-subheadline"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              VeritasDAO is a decentralized guild funding and permanently archiving investigative journalism. 
              Built on a foundation that cannot be censored.
            </motion.p>

            <motion.div
              className="hero-cta-buttons"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}
            >
              {isWalletAvailable ? (
                <motion.button
                  className="cta-primary"
                  onClick={handleConnectClick}
                  whileHover={{ scale: 1.05, boxShadow: '0 0 30px var(--glow-primary)' }}
                  whileTap={{ scale: 0.95 }}
                  style={{ 
                    display: 'block', 
                    visibility: 'visible', 
                    opacity: 1,
                    minWidth: '250px',
                    padding: '1.25rem 3rem',
                    fontSize: '1.25rem',
                    cursor: 'pointer'
                  }}
                  type="button"
                >
                  Connect Wallet
                </motion.button>
              ) : (
                <motion.a
                  href="https://ethereum.org/en/wallets/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta-primary"
                  whileHover={{ scale: 1.05, boxShadow: '0 0 30px var(--glow-primary)' }}
                  whileTap={{ scale: 0.95 }}
                  style={{ 
                    display: 'block', 
                    visibility: 'visible', 
                    opacity: 1,
                    minWidth: '250px',
                    padding: '1.25rem 3rem',
                    fontSize: '1.25rem'
                  }}
                >
                  Install Wallet
                </motion.a>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* PinMe Section */}
      <section className="pinme-section">
        <div className="landing-container">
          <motion.div
            className="pinme-content"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="pinme-header">
              <motion.div
                className="pinme-badge"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <span className="pinme-icon">🌐</span>
                <span>Powered by PinMe</span>
              </motion.div>
              
              <motion.h2
                className="pinme-title"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                100% Censorship-Resistant Frontend
              </motion.h2>
              
              <motion.p
                className="pinme-subtitle"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                VeritasDAO is deployed as a DeFront (Decentralized Frontend) using PinMe, 
                ensuring our platform cannot be taken down or censored.
              </motion.p>
            </div>

            <div className="pinme-grid">
              <motion.div
                className="pinme-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.6 }}
                whileHover={{ y: -5 }}
              >
                <div className="pinme-card-icon">🔒</div>
                <h3 className="pinme-card-title">What is PinMe?</h3>
                <p className="pinme-card-description">
                  PinMe is a tool that deploys decentralized frontends (DeFront) to IPFS and ENS. 
                  It provides verifiable content-hash, tamper-proof delivery, and complete 
                  censorship resistance for web applications.
                </p>
              </motion.div>

              <motion.div
                className="pinme-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.6 }}
                whileHover={{ y: -5 }}
              >
                <div className="pinme-card-icon">🛡️</div>
                <h3 className="pinme-card-title">Why VeritasDAO Uses PinMe</h3>
                <p className="pinme-card-description">
                  A platform dedicated to truth ("Veritas") is useless if its frontend can be 
                  censored. PinMe ensures our entire UI is permanently archived on IPFS and 
                  accessible via ENS, making VeritasDAO truly decentralized from frontend to 
                  smart contracts.
                </p>
              </motion.div>

              <motion.div
                className="pinme-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, duration: 0.6 }}
                whileHover={{ y: -5 }}
              >
                <div className="pinme-card-icon">✨</div>
                <h3 className="pinme-card-title">Key Benefits</h3>
                <ul className="pinme-card-list">
                  <li>Tamper-proof UI that cannot be hijacked</li>
                  <li>No single point of failure</li>
                  <li>Permanent archival on IPFS</li>
                  <li>ENS domain integration</li>
                  <li>Verifiable content integrity</li>
                </ul>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={handleWalletConnect}
      />
    </div>
  )
}

export default LandingPage
