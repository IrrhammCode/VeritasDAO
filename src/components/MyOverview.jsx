import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useContracts } from '../hooks/useContracts'
import { useWallet } from '../contexts/WalletContext'
import { useToast } from '../contexts/ToastContext'
import { isSupportedNetwork } from '../utils/contractHelpers'
import './MyOverview.css'

function MyOverview() {
  const { account, chainId } = useWallet()
  const { getTokenBalance, getVotingPower, getUserActivity, delegate, requestFaucet, isLoading, contracts } = useContracts()
  const { success, error: showError } = useToast()
  const [balance, setBalance] = useState('0')
  const [votingPower, setVotingPower] = useState('0')
  const [activity, setActivity] = useState({ proposalsCreated: 0, votesCast: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isDelegating, setIsDelegating] = useState(false)
  const [isRequestingFaucet, setIsRequestingFaucet] = useState(false)

  useEffect(() => {
    if (!account || isLoading) {
      setLoading(false)
      return
    }

    // Check if on supported network
    if (chainId && !isSupportedNetwork(chainId)) {
      setError('Please switch to a supported network (Localhost or Sepolia)')
      setLoading(false)
      return
    }

    // Check if contracts are available
    if (!contracts.token || !contracts.governor) {
      // Don't show error, just set balance to 0
      setBalance('0.00')
      setVotingPower('0.00')
      setActivity({ proposalsCreated: 0, votesCast: 0 })
      setLoading(false)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Debug: Check contract availability
        console.log('Fetching overview data for:', account)
        console.log('Token contract available:', !!contracts.token)
        console.log('Governor contract available:', !!contracts.governor)
        
        if (contracts.token) {
          const tokenAddress = contracts.token.target || contracts.token.address
          console.log('Token contract address:', tokenAddress)
        }
        
        const [tokenBalance, votes, userActivity] = await Promise.all([
          getTokenBalance(account).catch((err) => {
            console.warn('Error getting token balance:', err)
            return '0'
          }),
          getVotingPower(account).catch((err) => {
            console.warn('Error getting voting power:', err)
            return '0'
          }),
          getUserActivity().catch(() => ({ proposalsCreated: 0, votesCast: 0 }))
        ])
        
        console.log('Raw balance:', tokenBalance, 'Raw votes:', votes)
        
        const balanceValue = parseFloat(tokenBalance || '0')
        const votesValue = parseFloat(votes || '0')
        
        const finalBalance = isNaN(balanceValue) ? '0.00' : balanceValue.toFixed(2)
        const finalVotes = isNaN(votesValue) ? '0.00' : votesValue.toFixed(2)
        
        console.log('Final balance:', finalBalance, 'Final votes:', finalVotes)
        
        setBalance(finalBalance)
        setVotingPower(finalVotes)
        setActivity(userActivity || { proposalsCreated: 0, votesCast: 0 })
      } catch (error) {
        console.error('Error fetching overview data:', error)
        // Set to 0 instead of showing error, so user can still see the UI
        setBalance('0.00')
        setVotingPower('0.00')
        setActivity({ proposalsCreated: 0, votesCast: 0 })
        // Only show error if it's a critical issue
        if (error.message && error.message.includes('network')) {
          setError('Network error. Please check your connection.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [account, chainId, getTokenBalance, getVotingPower, getUserActivity, isLoading, contracts, isSupportedNetwork])

  const handleFaucet = async () => {
    if (!account) {
      showError('Please connect your wallet first')
      return
    }
    setIsRequestingFaucet(true)
    try {
      console.log('Requesting faucet for:', account)
      const result = await requestFaucet(account)
      console.log('Faucet request result:', result)
      success(result.message || 'Tokens received successfully!')
      
      // Refresh balance multiple times to ensure it updates
      const refreshBalance = async (attempt = 1) => {
        try {
          const newBalance = await getTokenBalance(account)
          const balanceValue = parseFloat(newBalance || '0')
          console.log(`Balance check attempt ${attempt}:`, balanceValue)
          setBalance(balanceValue.toFixed(2))
          
          // If still 0 after 3 attempts, try a few more times with longer delays
          if (balanceValue === 0 && attempt < 5) {
            setTimeout(() => refreshBalance(attempt + 1), 3000 * attempt)
          }
        } catch (error) {
          console.error('Error refreshing balance:', error)
        }
      }
      
      // First refresh after 2 seconds
      setTimeout(() => refreshBalance(1), 2000)
      // Second refresh after 5 seconds
      setTimeout(() => refreshBalance(2), 5000)
      // Third refresh after 10 seconds
      setTimeout(() => refreshBalance(3), 10000)
      
    } catch (error) {
      console.error('Error requesting faucet:', error)
      showError(error.message || 'Failed to request tokens from faucet')
    } finally {
      setIsRequestingFaucet(false)
    }
  }

  const handleDelegate = async () => {
    if (!account) {
      showError('Please connect your wallet')
      return
    }

    setIsDelegating(true)
    try {
      await delegate(account) // Delegate to self
      success('Voting power delegated successfully!')
      // Refresh voting power
      const votes = await getVotingPower(account)
      setVotingPower(parseFloat(votes || '0').toFixed(2))
    } catch (error) {
      console.error('Error delegating:', error)
      showError(error.message || 'Failed to delegate voting power')
    } finally {
      setIsDelegating(false)
    }
  }

  const formatNumber = (num) => {
    const value = parseFloat(num || '0')
    if (isNaN(value)) return '0.00'
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  return (
    <div className="my-overview">
      <h2 className="section-title">My Overview</h2>
      
      <div className="overview-cards">
        {/* Card 1: $VERITAS Balance */}
        <motion.div
          className="overview-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          whileHover={{ scale: 1.02, y: -5 }}
        >
          <div className="card-header">
            <h3 className="card-title">My $VERITAS</h3>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading-skeleton">Loading...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : (
              <>
                <div className="card-value">{formatNumber(balance)}</div>
                <div className="card-label">$VERITAS</div>
                {parseFloat(balance) === 0 && (
                  <>
                    <div className="card-info-message">
                      <p className="info-icon">💰</p>
                      <p><strong>Balance: 0.00 VERITAS</strong></p>
                      <p className="info-hint">New wallets start with 0 tokens. Get free test tokens from the faucet!</p>
                    </div>
                    <motion.button
                      className="faucet-button"
                      onClick={handleFaucet}
                      disabled={isRequestingFaucet || !account}
                      whileHover={!isRequestingFaucet && account ? { scale: 1.05 } : {}}
                      whileTap={!isRequestingFaucet && account ? { scale: 0.95 } : {}}
                    >
                      {isRequestingFaucet ? (
                        <>
                          <span className="button-spinner">⏳</span> Requesting...
                        </>
                      ) : (
                        <>
                          <span className="button-icon">🚰</span> Get Free Tokens
                        </>
                      )}
                    </motion.button>
                  </>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* Card 2: Voting Power */}
        <motion.div
          className="overview-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          whileHover={{ scale: 1.02, y: -5 }}
        >
          <div className="card-header">
            <h3 className="card-title">My Voting Power</h3>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading-skeleton">Loading...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : (
              <>
                <div className="card-value">{formatNumber(votingPower)}</div>
                <div className="card-label">Votes</div>
                {parseFloat(votingPower) === 0 ? (
                  <>
                    {parseFloat(balance) === 0 ? (
                      <div className="card-info-message">
                        <p className="info-icon">🗳️</p>
                        <p><strong>Voting Power: 0.00</strong></p>
                        <p className="info-hint">Get VERITAS tokens first, then delegate to activate.</p>
                      </div>
                    ) : (
                      <>
                        <div className="card-info-message">
                          <p className="info-icon">⚡</p>
                          <p><strong>Not delegated</strong></p>
                          <p className="info-hint">Delegate your tokens to activate voting power.</p>
                        </div>
                        <motion.button
                          className="delegate-button"
                          onClick={handleDelegate}
                          disabled={isDelegating || parseFloat(balance) === 0}
                          whileHover={!isDelegating && parseFloat(balance) > 0 ? { scale: 1.05 } : {}}
                          whileTap={!isDelegating && parseFloat(balance) > 0 ? { scale: 0.95 } : {}}
                        >
                          {isDelegating ? 'Delegating...' : 'Delegate to Self'}
                        </motion.button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <p className="card-note">Voting power is active.</p>
                    <motion.button
                      className="delegate-button"
                      onClick={handleDelegate}
                      disabled={isDelegating}
                      whileHover={!isDelegating ? { scale: 1.05 } : {}}
                      whileTap={!isDelegating ? { scale: 0.95 } : {}}
                    >
                      {isDelegating ? 'Delegating...' : 'Update Delegation'}
                    </motion.button>
                  </>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* Card 3: My Recent Activity */}
        <motion.div
          className="overview-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          whileHover={{ scale: 1.02, y: -5 }}
        >
          <div className="card-header">
            <h3 className="card-title">My Activity</h3>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading-skeleton">Loading...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : (
              <>
                <p className="activity-text">
                  {activity.proposalsCreated === 0 
                    ? 'You have not submitted any proposals yet.' 
                    : `You have submitted ${activity.proposalsCreated} proposal${activity.proposalsCreated > 1 ? 's' : ''}.`}
                </p>
                <p className="activity-text">
                  {activity.votesCast === 0
                    ? 'You have not cast any votes yet.'
                    : `You have voted on ${activity.votesCast} proposal${activity.votesCast > 1 ? 's' : ''}.`}
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default MyOverview
