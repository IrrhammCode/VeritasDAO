import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useContracts } from '../hooks/useContracts'
import { useWallet } from '../contexts/WalletContext'
import { useToast } from '../contexts/ToastContext'
import { isSupportedNetwork, formatTimeRemaining } from '../utils/contractHelpers'
import './ActiveProposals.css'

function ActiveProposals() {
  const { account, chainId } = useWallet()
  const { getAllProposals, vote, getVotingPower, getVotingPowerAtBlock, isLoading: contractsLoading, contracts } = useContracts()
  const { success, error: showError } = useToast()
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState({})
  const [error, setError] = useState(null)
  const [votingPower, setVotingPower] = useState('0')

  const fetchProposals = React.useCallback(async () => {
    if (contractsLoading) return

    // Check if on supported network
    if (chainId && !isSupportedNetwork(chainId)) {
      setError('Please switch to a supported network (Localhost or Sepolia)')
      setLoading(false)
      return
    }

    // Check if contracts are available
    if (!contracts.governor) {
      setError('Governor contract not configured. Please set contract addresses in .env file')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const allProposals = await getAllProposals()
      // Filter active and pending proposals (new proposals start as Pending)
      const activeProposals = allProposals.filter(p => p.state === 'Active' || p.state === 'Pending')
      setProposals(activeProposals)
    } catch (error) {
      console.error('Error fetching proposals:', error)
      setError('Failed to load proposals. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }, [getAllProposals, contractsLoading, chainId, contracts])

  useEffect(() => {
    fetchProposals()
    // Refresh every 30 seconds
    const interval = setInterval(fetchProposals, 30000)
    return () => clearInterval(interval)
  }, [fetchProposals])

  // Listen for proposal submission events to refresh
  useEffect(() => {
    const handleProposalSubmitted = (e) => {
      // Wait for block confirmation (usually 1-2 blocks on Sepolia)
      setTimeout(() => {
        fetchProposals()
      }, 5000) // Wait 5 seconds for block confirmation
      
      // Refresh again after 15 seconds to ensure it's picked up
      setTimeout(() => {
        fetchProposals()
      }, 15000)
    }

    const handleStorageChange = (e) => {
      if (e.key === 'lastProposalSubmitted') {
        setTimeout(() => {
          fetchProposals()
        }, 5000)
      }
    }

    // Listen for custom event
    window.addEventListener('proposalSubmitted', handleProposalSubmitted)
    // Listen for storage events (cross-tab)
    window.addEventListener('storage', handleStorageChange)
    
    // Also check localStorage on mount/update
    const checkLastSubmission = () => {
      try {
        const lastSubmission = localStorage.getItem('lastProposalSubmitted')
        if (lastSubmission) {
          const data = JSON.parse(lastSubmission)
          // If submission was less than 30 seconds ago, refresh
          if (Date.now() - data.timestamp < 30000) {
            fetchProposals()
          }
        }
      } catch (error) {
        console.error('Error checking last submission:', error)
      }
    }
    
    checkLastSubmission()
    
    return () => {
      window.removeEventListener('proposalSubmitted', handleProposalSubmitted)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [fetchProposals])

  // Check voting power
  useEffect(() => {
    if (account && contracts.token) {
      getVotingPower(account).then(power => {
        setVotingPower(power || '0')
      }).catch(() => {
        setVotingPower('0')
      })
    } else {
      setVotingPower('0')
    }
  }, [account, contracts.token, getVotingPower])

  const formatAddress = (address) => {
    if (!address) return 'Unknown'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }


  const handleVote = async (proposalId, support) => {
    if (!account) {
      showError('Please connect your wallet to vote')
      return
    }

    // Find the proposal to check its snapshot block
    const proposal = proposals.find(p => p.id === proposalId)
    if (!proposal) {
      showError('Proposal not found')
      return
    }

    // Check if user already voted on THIS proposal
    if (proposal.hasVoted) {
      showError('You have already voted on this proposal')
      return
    }

    // Check voting power at the proposal's snapshot block (IMPORTANT: each proposal has its own snapshot)
    let votingPowerAtSnapshot = '0'
    if (contracts.token && getVotingPowerAtBlock && proposal.snapshot) {
      try {
        votingPowerAtSnapshot = await getVotingPowerAtBlock(account, proposal.snapshot)
        const powerAtSnapshotNum = parseFloat(votingPowerAtSnapshot || '0')
        
        if (powerAtSnapshotNum === 0) {
          showError(
            `⚠️ Your voting power was 0 at this proposal's snapshot block (${proposal.snapshot}). ` +
            `Your vote will not be counted! You must delegate your VERITAS tokens BEFORE a proposal is created. ` +
            `Please delegate your tokens and wait for the next proposal.`
          )
          return
        }
      } catch (error) {
        // Continue anyway - let the contract handle it
      }
    }

    setVoting(prev => ({ ...prev, [proposalId]: support }))
    try {
      const txHash = await vote(proposalId, support)
      
      // Each vote costs 10 VERITAS (fixed)
      const VOTE_COST = 10
      success(`Vote submitted! This vote costs ${VOTE_COST} VERITAS. Transaction: ${txHash.slice(0, 10)}...`)
      
      // Dispatch event to notify MyOverview to refresh voting power
      window.dispatchEvent(new CustomEvent('voteCast', { 
        detail: { proposalId, support, txHash, votingPower: votingPowerAtSnapshot, voteCost: VOTE_COST } 
      }))
      
      // Wait for block confirmation and refresh proposals multiple times
      // First refresh after 5 seconds (wait for block confirmation)
      setTimeout(async () => {
        try {
          const allProposals = await getAllProposals()
          const activeProposals = allProposals.filter(p => p.state === 'Active' || p.state === 'Pending')
          setProposals(activeProposals)
          
          // Refresh again after another 8 seconds to ensure all votes are updated
          setTimeout(async () => {
            try {
              const allProposals2 = await getAllProposals()
              const activeProposals2 = allProposals2.filter(p => p.state === 'Active' || p.state === 'Pending')
              setProposals(activeProposals2)
              
              // Final refresh after 15 seconds total
              setTimeout(async () => {
                try {
                  const allProposals3 = await getAllProposals()
                  const activeProposals3 = allProposals3.filter(p => p.state === 'Active' || p.state === 'Pending')
                  setProposals(activeProposals3)
                } catch (err) {
                  console.error('Error in final refresh:', err)
                }
              }, 7000)
            } catch (err) {
              console.error('Error in second refresh:', err)
            }
          }, 8000)
        } catch (err) {
          console.error('Error refreshing proposals:', err)
        }
      }, 5000)
    } catch (error) {
      console.error('Error voting:', error)
      showError(error.message || 'Failed to submit vote')
    } finally {
      setVoting(prev => {
        const newVoting = { ...prev }
        delete newVoting[proposalId]
        return newVoting
      })
    }
  }

  const calculateVotePercentages = (votesFor, votesAgainst, votesAbstain = 0) => {
    const total = parseFloat(votesFor) + parseFloat(votesAgainst) + parseFloat(votesAbstain)
    if (total === 0) return { yes: 0, no: 0, abstain: 0 }
    return {
      yes: (parseFloat(votesFor) / total) * 100,
      no: (parseFloat(votesAgainst) / total) * 100,
      abstain: (parseFloat(votesAbstain) / total) * 100
    }
  }

  const parseProposalDescription = (description) => {
    if (!description) return {}
    
    const lines = description.split('\n')
    const parsed = {
      title: '',
      author: '',
      category: '',
      requestedAmount: '',
      estimatedDuration: '',
      description: ''
    }

    let descriptionStart = false
    let descriptionLines = []

    lines.forEach(line => {
      if (line.startsWith('Funding Request:')) {
        parsed.title = line.replace('Funding Request:', '').trim()
      } else if (line.startsWith('Author:')) {
        parsed.author = line.replace('Author:', '').trim()
      } else if (line.startsWith('Category:')) {
        parsed.category = line.replace('Category:', '').trim()
      } else if (line.startsWith('Requested Amount:')) {
        parsed.requestedAmount = line.replace('Requested Amount:', '').trim()
      } else if (line.startsWith('Estimated Duration:')) {
        parsed.estimatedDuration = line.replace('Estimated Duration:', '').trim()
      } else if (line.startsWith('Description:')) {
        descriptionStart = true
        const descText = line.replace('Description:', '').trim()
        if (descText) descriptionLines.push(descText)
      } else if (descriptionStart && line.trim()) {
        descriptionLines.push(line.trim())
      }
    })

    parsed.description = descriptionLines.join('\n')
    return parsed
  }

  if (loading) {
    return (
      <div className="active-proposals">
        <h2 className="section-title">Active Proposals (Needs Your Vote)</h2>
        <div className="loading-state">Loading proposals...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="active-proposals">
        <h2 className="section-title">Active Proposals (Needs Your Vote)</h2>
        <div className="error-state">{error}</div>
      </div>
    )
  }

  if (proposals.length === 0) {
    return (
      <div className="active-proposals">
        <h2 className="section-title">Active Proposals (Needs Your Vote)</h2>
        <div className="empty-state">No active proposals at this time.</div>
      </div>
    )
  }

  return (
    <div className="active-proposals">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="section-title">Active Proposals (Needs Your Vote)</h2>
        <motion.button
          onClick={fetchProposals}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--accent-blue)',
            color: '#fff',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontSize: '0.875rem',
            fontWeight: 600,
            boxShadow: 'var(--shadow-emboss)'
          }}
          whileHover={!loading ? { scale: 1.05 } : {}}
          whileTap={!loading ? { scale: 0.95 } : {}}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh'}
        </motion.button>
      </div>
      
      <div className="proposals-list">
        {proposals.map((proposal, index) => {
          const parsed = parseProposalDescription(proposal.description)
          const percentages = calculateVotePercentages(proposal.votesFor, proposal.votesAgainst, proposal.votesAbstain || 0)
          const isVoting = voting[proposal.id] !== undefined
          const hasVoted = proposal.hasVoted
          // Total votes in VERITAS (each vote = 10 VERITAS)
          const totalVotes = parseFloat(proposal.votesFor) + parseFloat(proposal.votesAgainst) + parseFloat(proposal.votesAbstain || 0)
          // Calculate number of votes (total VERITAS / 10)
          const totalVoteCount = Math.round(totalVotes / 10)

          return (
            <motion.div
              key={proposal.id}
              className="proposal-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.01, y: -2 }}
            >
              {/* Header */}
              <div className="proposal-header">
                <div className="proposal-id-wrapper">
                  <span className="proposal-id">Proposal #{proposal.id.length > 20 ? `${proposal.id.slice(0, 10)}...${proposal.id.slice(-8)}` : proposal.id}</span>
                </div>
                <div className={`proposal-status ${proposal.state === 'Active' ? 'active-badge' : proposal.state === 'Pending' ? 'pending-badge' : ''}`}>
                  <span className="status-dot"></span>
                  {proposal.state}
                </div>
              </div>
              
              {/* Title */}
              <h3 className="proposal-title">
                {parsed.title || `Proposal #${proposal.id.slice(0, 8)}...`}
              </h3>

              {/* Proposal Details Grid */}
              <div className="proposal-details-grid">
                {parsed.author && (
                  <div className="detail-item">
                    <span className="detail-icon">👤</span>
                    <div className="detail-content">
                      <span className="detail-label">Author</span>
                      <span className="detail-value">{parsed.author}</span>
                    </div>
                  </div>
                )}
                {parsed.category && (
                  <div className="detail-item">
                    <span className="detail-icon">📁</span>
                    <div className="detail-content">
                      <span className="detail-label">Category</span>
                      <span className="detail-value">{parsed.category}</span>
                    </div>
                  </div>
                )}
                {parsed.requestedAmount && (
                  <div className="detail-item">
                    <span className="detail-icon">💰</span>
                    <div className="detail-content">
                      <span className="detail-label">Requested Amount</span>
                      <span className="detail-value highlight">{parsed.requestedAmount}</span>
                    </div>
                  </div>
                )}
                {parsed.estimatedDuration && (
                  <div className="detail-item">
                    <span className="detail-icon">⏱️</span>
                    <div className="detail-content">
                      <span className="detail-label">Duration</span>
                      <span className="detail-value">{parsed.estimatedDuration}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {parsed.description && (
                <div className="proposal-description">
                  <p>{parsed.description}</p>
                </div>
              )}
              
              {/* Meta Info */}
              <div className="proposal-meta">
                <div className="meta-item">
                  <span className="meta-label">Proposed by:</span>
                  <span className="meta-value">{formatAddress(proposal.proposer)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-icon">⏱️</span>
                  <span className="meta-value">{proposal.deadlineTimestamp ? formatTimeRemaining(proposal.deadlineTimestamp) : 'Calculating...'}</span>
                </div>
              </div>

              {/* Voting Progress */}
              <div className="proposal-voting">
                <div className="voting-header">
                  <h4 className="voting-title">Voting Progress</h4>
                  <span className="total-votes">{totalVoteCount} vote{totalVoteCount !== 1 ? 's' : ''} ({totalVotes.toFixed(0)} VERITAS)</span>
                </div>
                
                {/* Voting Power Info */}
                {account && proposal.snapshot && (
                  <div className="voting-power-info" style={{ 
                    padding: '0.75rem', 
                    background: 'var(--bg-tertiary)', 
                    borderRadius: '8px', 
                    fontSize: '0.875rem',
                    marginBottom: '1rem'
                  }}>
                    <p style={{ margin: 0 }}>
                      💡 <strong>Note:</strong> Each vote costs <strong>10 VERITAS</strong>. 
                      Your voting power is calculated at snapshot block {proposal.snapshot}. 
                      Each proposal has its own snapshot, so you can vote on multiple proposals independently.
                    </p>
                  </div>
                )}
                
                <div className="voting-progress">
                  <div className="progress-bar-container">
                    <motion.div 
                      className="progress-bar"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      {percentages.yes > 0 && (
                        <motion.div 
                          className="progress-fill yes"
                          initial={{ width: 0 }}
                          animate={{ width: `${percentages.yes}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          style={{ left: '0%' }}
                        />
                      )}
                      {percentages.no > 0 && (
                        <motion.div 
                          className="progress-fill no"
                          initial={{ width: 0 }}
                          animate={{ width: `${percentages.no}%` }}
                          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                          style={{ left: `${percentages.yes}%` }}
                        />
                      )}
                      {percentages.abstain > 0 && (
                        <motion.div 
                          className="progress-fill abstain"
                          initial={{ width: 0 }}
                          animate={{ width: `${percentages.abstain}%` }}
                          transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                          style={{ left: `${percentages.yes + percentages.no}%` }}
                        />
                      )}
                    </motion.div>
                  </div>
                  
                  <div className="progress-labels">
                    <div className="label-item">
                      <span className="label-icon label-yes-icon">✓</span>
                      <span className="label-text">
                        <span className="label-yes">YES</span>
                        <span className="label-percentage">{percentages.yes.toFixed(1)}%</span>
                      </span>
                      <span className="label-votes">{parseFloat(proposal.votesFor).toFixed(2)} VERITAS</span>
                    </div>
                    <div className="label-item">
                      <span className="label-icon label-no-icon">✗</span>
                      <span className="label-text">
                        <span className="label-no">NO</span>
                        <span className="label-percentage">{percentages.no.toFixed(1)}%</span>
                      </span>
                      <span className="label-votes">{parseFloat(proposal.votesAgainst).toFixed(2)} VERITAS</span>
                    </div>
                    {(proposal.votesAbstain && parseFloat(proposal.votesAbstain) > 0) && (
                      <div className="label-item">
                        <span className="label-icon label-abstain-icon">○</span>
                        <span className="label-text">
                          <span className="label-abstain">ABSTAIN</span>
                          <span className="label-percentage">{percentages.abstain.toFixed(1)}%</span>
                        </span>
                        <span className="label-votes">{parseFloat(proposal.votesAbstain).toFixed(2)} VERITAS</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Voting Actions */}
              <div className="proposal-actions">
                <motion.button
                  className="vote-button vote-yes"
                  onClick={() => handleVote(proposal.id, 1)}
                  disabled={isVoting || hasVoted}
                  whileHover={!isVoting && !hasVoted ? { scale: 1.02, y: -2 } : {}}
                  whileTap={!isVoting && !hasVoted ? { scale: 0.98 } : {}}
                >
                  <span className="button-icon">✓</span>
                  <span className="button-text">
                    {isVoting && voting[proposal.id] === 1 ? 'Voting...' : hasVoted ? '✓ Voted' : 'Vote YES'}
                  </span>
                </motion.button>
                <motion.button
                  className="vote-button vote-no"
                  onClick={() => handleVote(proposal.id, 0)}
                  disabled={isVoting || hasVoted}
                  whileHover={!isVoting && !hasVoted ? { scale: 1.02, y: -2 } : {}}
                  whileTap={!isVoting && !hasVoted ? { scale: 0.98 } : {}}
                >
                  <span className="button-icon">✗</span>
                  <span className="button-text">
                    {isVoting && voting[proposal.id] === 0 ? 'Voting...' : hasVoted ? '✗ Voted' : 'Vote NO'}
                  </span>
                </motion.button>
                <motion.button
                  className="vote-button vote-abstain"
                  onClick={() => handleVote(proposal.id, 2)}
                  disabled={isVoting || hasVoted}
                  whileHover={!isVoting && !hasVoted ? { scale: 1.02, y: -2 } : {}}
                  whileTap={!isVoting && !hasVoted ? { scale: 0.98 } : {}}
                >
                  <span className="button-icon">○</span>
                  <span className="button-text">
                    {isVoting && voting[proposal.id] === 2 ? 'Voting...' : hasVoted ? '○ Voted' : 'Abstain'}
                  </span>
                </motion.button>
              </div>

              {index < proposals.length - 1 && <div className="proposal-divider" />}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default ActiveProposals
