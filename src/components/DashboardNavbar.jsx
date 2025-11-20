import React from 'react'
import { motion } from 'framer-motion'
import { useWallet } from '../contexts/WalletContext'
import { CHAIN_IDS } from '../config/contracts'
import { useToast } from '../contexts/ToastContext'
import './DashboardNavbar.css'

function DashboardNavbar({ activeSection, setActiveSection }) {
  const { account, chainId, switchNetwork, disconnect } = useWallet()
  const { error: showError, success } = useToast()

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getNetworkName = () => {
    if (!chainId) return 'Unknown'
    // Explicitly check for Sepolia chainId (11155111) - always return "Sepolia"
    if (chainId === 11155111 || chainId === CHAIN_IDS.sepolia) return 'Sepolia Testnet'
    if (chainId === CHAIN_IDS.localhost) return 'Localhost'
    if (chainId === CHAIN_IDS.mainnet) return 'Mainnet'
    return `Chain ${chainId}`
  }

  const isCorrectNetwork = () => {
    // Explicitly check for Sepolia chainId (11155111)
    return chainId === 11155111 || chainId === CHAIN_IDS.sepolia
  }

  const handleSwitchToSepolia = async () => {
    try {
      // Import ensureSepoliaNetwork to update network name
      const { ensureSepoliaNetwork } = await import('../utils/metamaskNetwork')
      await ensureSepoliaNetwork()
      const switched = await switchNetwork(CHAIN_IDS.sepolia)
      if (switched) {
        success('Switched to Sepolia testnet')
      }
    } catch (error) {
      console.error('Error switching to Sepolia:', error)
      showError('Failed to switch network. Please switch manually in your wallet.')
    }
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'read', label: 'Read' },
    { id: 'donate', label: 'Donate' },
    { id: 'proposals', label: 'Proposals' },
    { id: 'my-proposals', label: 'My Proposals' },
    { id: 'reports', label: 'Archive' },
    { id: 'submit', label: 'Submit' },
  ]

  // Only show navbar if wallet is connected
  if (!account) {
    return null
  }

  return (
    <nav className="dashboard-navbar">
      <div className="dashboard-navbar-container">
        {/* Logo - Left */}
        <motion.div
          className="dashboard-navbar-logo"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <img src="/veritasdao.png" alt="VeritasDAO" className="logo-image" />
          <span className="logo-text">VeritasDAO</span>
        </motion.div>

        {/* Menu - Center */}
        <ul className="dashboard-navbar-menu">
          {navItems.map((item) => {
            const isActive = activeSection === item.id
            return (
              <li key={item.id}>
                <motion.button
                  className={`dashboard-nav-link ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveSection(item.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item.label}
                </motion.button>
              </li>
            )
          })}
        </ul>

        {/* Wallet Status - Right */}
        <motion.div
          className="dashboard-wallet-status"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {!isCorrectNetwork() && chainId && (
            <motion.button
              className="network-warning-button"
              onClick={handleSwitchToSepolia}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Switch to Sepolia testnet"
            >
              ⚠️ Switch to Sepolia
            </motion.button>
          )}
          <div className="network-info">
            <span className="network-name">{getNetworkName()}</span>
          </div>
          <div className="wallet-icon">🦊</div>
          <div className="wallet-address">{formatAddress(account)}</div>
          <div className={`wallet-status-dot ${isCorrectNetwork() ? 'connected' : 'disconnected'}`}></div>
          <motion.button
            className="disconnect-wallet-button"
            onClick={disconnect}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Disconnect wallet"
          >
            Disconnect
          </motion.button>
        </motion.div>
      </div>
    </nav>
  )
}

export default DashboardNavbar

