import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ethers } from 'ethers'
import { useContracts } from '../hooks/useContracts'
import { useWallet } from '../contexts/WalletContext'
import { useToast } from '../contexts/ToastContext'
import { isSupportedNetwork } from '../utils/contractHelpers'
import './MyOverview.css'

function MyOverview() {
  const { account, chainId } = useWallet()
  const { getTokenBalance, getVotingPower, getUserActivity, delegate, requestFaucet, isJournalistVerified, isLoading, contracts, getAllProposals } = useContracts()
  const { success, error: showError } = useToast()
  const [balance, setBalance] = useState('0')
  const [votingPower, setVotingPower] = useState('0')
  const [usedVotingPower, setUsedVotingPower] = useState('0')
  const [availableVotingPower, setAvailableVotingPower] = useState('0')
  const [activity, setActivity] = useState({ proposalsCreated: 0, votesCast: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isDelegating, setIsDelegating] = useState(false)
  const [isRequestingFaucet, setIsRequestingFaucet] = useState(false)
  const [isVerifiedJournalist, setIsVerifiedJournalist] = useState(false)

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
        
        const [tokenBalance, votes, userActivity] = await Promise.all([
          getTokenBalance(account).catch((err) => {
            return '0'
          }),
          getVotingPower(account).catch((err) => {
            return '0'
          }),
          getUserActivity().catch(() => ({ proposalsCreated: 0, votesCast: 0 }))
        ])
        
        // Calculate used voting power from all votes cast
        // Each vote costs 10 VERITAS (fixed amount)
        const VOTE_COST = 10 // Fixed cost per vote in VERITAS
        let totalUsedPower = 0
        if (contracts.governor && account) {
          try {
            // Query all VoteCast events for this user
            const voteFilter = contracts.governor.filters.VoteCast(account)
            const voteEvents = await contracts.governor.queryFilter(voteFilter)
            
            // Each vote costs 10 VERITAS (fixed)
            totalUsedPower = voteEvents.length * VOTE_COST
          } catch (error) {
            // Silent fail
          }
        }
        
        const balanceValue = parseFloat(tokenBalance || '0')
        const votesValue = parseFloat(votes || '0')
        const usedPowerValue = totalUsedPower
        
        const finalBalance = isNaN(balanceValue) ? '0.00' : balanceValue.toFixed(2)
        const finalVotes = isNaN(votesValue) ? '0.00' : votesValue.toFixed(2)
        const finalUsedPower = isNaN(usedPowerValue) ? '0.00' : usedPowerValue.toFixed(2)
        const finalAvailablePower = Math.max(0, votesValue - usedPowerValue).toFixed(2)
        
        setBalance(finalBalance)
        setVotingPower(finalVotes)
        setUsedVotingPower(finalUsedPower)
        setAvailableVotingPower(finalAvailablePower)
        setActivity(userActivity || { proposalsCreated: 0, votesCast: 0 })
        
        // Check if user is verified journalist
        if (account && contracts.journalistRegistry) {
          try {
            const verified = await isJournalistVerified(account)
            setIsVerifiedJournalist(verified)
          } catch (error) {
            console.error('Error checking journalist verification:', error)
            setIsVerifiedJournalist(false)
          }
        } else {
          setIsVerifiedJournalist(false)
        }
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
    
    // Listen for vote events to refresh voting power
    const handleVoteCast = () => {
      setTimeout(() => {
        fetchData()
      }, 3000)
    }
    
    // Listen for delegation events to refresh voting power
    const handleDelegation = () => {
      setTimeout(() => {
        fetchData()
      }, 3000)
    }
    
    window.addEventListener('voteCast', handleVoteCast)
    window.addEventListener('delegationUpdated', handleDelegation)
    
    return () => {
      window.removeEventListener('voteCast', handleVoteCast)
      window.removeEventListener('delegationUpdated', handleDelegation)
    }
  }, [account, chainId, getTokenBalance, getVotingPower, getUserActivity, isJournalistVerified, isLoading, contracts, isSupportedNetwork, getAllProposals])

  const handleFaucet = async () => {
    if (!account) {
      showError('Please connect your wallet first')
      return
    }
    setIsRequestingFaucet(true)
    try {
      const result = await requestFaucet(account)
      success(result.message || 'Tokens received successfully!')
      
      // Refresh balance multiple times to ensure it updates
      const refreshBalance = async (attempt = 1) => {
        try {
          const newBalance = await getTokenBalance(account)
          const balanceValue = parseFloat(newBalance || '0')
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
      const txHash = await delegate(account) // Delegate to self
      success('Voting power delegated successfully! Transaction: ' + txHash.slice(0, 10) + '...')
      
      // Refresh voting power multiple times to ensure it updates
      // Voting power update might take a few blocks to reflect
      const refreshVotingPower = async (attempt = 1) => {
        try {
          // Get fresh voting power
          const votes = await getVotingPower(account)
          const votesValue = parseFloat(votes || '0')
          
          // Recalculate used and available power
          // Each vote costs 10 VERITAS (fixed amount)
          const VOTE_COST = 10 // Fixed cost per vote in VERITAS
          let totalUsedPower = 0
          if (contracts.governor && account) {
            try {
              // Query all VoteCast events for this user
              const voteFilter = contracts.governor.filters.VoteCast(account)
              const voteEvents = await contracts.governor.queryFilter(voteFilter)
              
              // Each vote costs 10 VERITAS (fixed)
              totalUsedPower = voteEvents.length * VOTE_COST
            } catch (error) {
              // Silent fail
            }
          }
          
          const finalVotes = isNaN(votesValue) ? '0.00' : votesValue.toFixed(2)
          const finalUsedPower = isNaN(totalUsedPower) ? '0.00' : totalUsedPower.toFixed(2)
          const finalAvailablePower = Math.max(0, votesValue - totalUsedPower).toFixed(2)
          
          
          setVotingPower(finalVotes)
          setUsedVotingPower(finalUsedPower)
          setAvailableVotingPower(finalAvailablePower)
          
          // If voting power is still 0 and we have balance, try again
          if (votesValue === 0 && parseFloat(balance) > 0 && attempt < 5) {
            setTimeout(() => refreshVotingPower(attempt + 1), 3000 * attempt)
          }
        } catch (error) {
          console.error(`Error refreshing voting power (attempt ${attempt}):`, error)
          // Retry if not last attempt
          if (attempt < 3) {
            setTimeout(() => refreshVotingPower(attempt + 1), 3000 * attempt)
          }
        }
      }
      
      // First refresh after 2 seconds (wait for block confirmation)
      setTimeout(() => refreshVotingPower(1), 2000)
      // Second refresh after 5 seconds
      setTimeout(() => refreshVotingPower(2), 5000)
      // Third refresh after 10 seconds
      setTimeout(() => refreshVotingPower(3), 10000)
      
      // Also dispatch event to trigger full data refresh
      window.dispatchEvent(new CustomEvent('delegationUpdated', { 
        detail: { account } 
      }))
      
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <h2 className="section-title">My Overview</h2>
        {isVerifiedJournalist && account && (
          <span className="verified-journalist-badge" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontSize: '0.875rem',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}>
            <span>✓</span>
            Verified Journalist
          </span>
        )}
      </div>
      
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
                <div className="card-value">{formatNumber(availableVotingPower)}</div>
                <div className="card-label">Available Voting Power</div>
                {parseFloat(votingPower) > 0 && (
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-secondary)', 
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span>Total Power:</span>
                      <span>{formatNumber(votingPower)} VERITAS</span>
                    </div>
                    {parseFloat(usedVotingPower) > 0 && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span>Used ({Math.floor(parseFloat(usedVotingPower) / 10)} votes × 10 VERITAS):</span>
                          <span style={{ color: 'var(--accent-red)' }}>-{formatNumber(usedVotingPower)} VERITAS</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                          <span>Available:</span>
                          <span style={{ color: 'var(--accent-green)' }}>{formatNumber(availableVotingPower)} VERITAS</span>
                        </div>
                      </>
                    )}
                    {parseFloat(usedVotingPower) === 0 && (
                      <div style={{ 
                        marginTop: '0.5rem', 
                        padding: '0.5rem', 
                        background: 'rgba(16, 185, 129, 0.1)', 
                        borderRadius: '6px',
                        fontSize: '0.7rem'
                      }}>
                        <p style={{ margin: 0 }}>
                          💡 Each vote costs <strong>10 VERITAS</strong>. You can cast {Math.floor(parseFloat(votingPower) / 10)} vote(s) with your current power.
                        </p>
                      </div>
                    )}
                  </div>
                )}
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
