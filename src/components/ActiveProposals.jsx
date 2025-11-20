import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useContracts } from '../hooks/useContracts'
import { useWallet } from '../contexts/WalletContext'
import { useToast } from '../contexts/ToastContext'
import { isSupportedNetwork, formatTimeRemaining } from '../utils/contractHelpers'
import './ActiveProposals.css'

function ActiveProposals() {
  const { account, chainId } = useWallet()
  const { getAllProposals, vote, getVotingPower, isLoading: contractsLoading, contracts } = useContracts()
  const { success, error: showError } = useToast()
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState({})
  const [error, setError] = useState(null)
  const [votingPower, setVotingPower] = useState('0')

  useEffect(() => {
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

    const fetchProposals = async () => {
      setLoading(true)
      setError(null)
      try {
        const allProposals = await getAllProposals()
        // Filter only active proposals
        const activeProposals = allProposals.filter(p => p.state === 'Active')
        setProposals(activeProposals)
      } catch (error) {
        console.error('Error fetching proposals:', error)
        setError('Failed to load proposals. Please check your connection.')
      } finally {
        setLoading(false)
      }
    }

    fetchProposals()
    // Refresh every 30 seconds
    const interval = setInterval(fetchProposals, 30000)
    return () => clearInterval(interval)
  }, [getAllProposals, contractsLoading, chainId, contracts])

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

    // Check voting power before voting
    if (contracts.token) {
      const power = await getVotingPower(account)
      const powerNum = parseFloat(power || '0')
      
      if (powerNum === 0) {
        showError('You need voting power to vote. Delegate your VERITAS tokens first to activate voting power.')
        return
      }
    }

    setVoting(prev => ({ ...prev, [proposalId]: support }))
    try {
      // Support: 0 = Against, 1 = For, 2 = Abstain
      console.log(`Voting on proposal ${proposalId} with support: ${support} (0=Against, 1=For, 2=Abstain)`)
      const txHash = await vote(proposalId, support)
      console.log('Vote transaction hash:', txHash)
      success(`Vote submitted! Transaction: ${txHash.slice(0, 10)}...`)
      
      // Wait for block confirmation and refresh proposals multiple times
      // First refresh after 3 seconds
      setTimeout(async () => {
        try {
          const allProposals = await getAllProposals()
          const activeProposals = allProposals.filter(p => p.state === 'Active')
          setProposals(activeProposals)
          console.log('Proposals refreshed after vote')
          
          // Refresh again after another 5 seconds to ensure votes are updated
          setTimeout(async () => {
            try {
              const allProposals2 = await getAllProposals()
              const activeProposals2 = allProposals2.filter(p => p.state === 'Active')
              setProposals(activeProposals2)
              console.log('Proposals refreshed again after vote (second refresh)')
            } catch (err) {
              console.error('Error in second refresh:', err)
            }
          }, 5000)
        } catch (err) {
          console.error('Error refreshing proposals:', err)
        }
      }, 3000)
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
      <h2 className="section-title">Active Proposals (Needs Your Vote)</h2>
      
      <div className="proposals-list">
        {proposals.map((proposal, index) => {
          const parsed = parseProposalDescription(proposal.description)
          const percentages = calculateVotePercentages(proposal.votesFor, proposal.votesAgainst, proposal.votesAbstain || 0)
          const isVoting = voting[proposal.id] !== undefined
          const hasVoted = proposal.hasVoted
          const totalVotes = parseFloat(proposal.votesFor) + parseFloat(proposal.votesAgainst) + parseFloat(proposal.votesAbstain || 0)

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
                <div className="proposal-status active-badge">
                  <span className="status-dot"></span>
                  Active
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
                  <span className="total-votes">{totalVotes.toFixed(2)} VERITAS</span>
                </div>
                
                {/* Voting Power Warning */}
                {account && parseFloat(votingPower || '0') === 0 && (
                  <div className="voting-power-warning">
                    <p>⚠️ <strong>No voting power available.</strong> Delegate your VERITAS tokens to activate voting power.</p>
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
                  disabled={isVoting || hasVoted || parseFloat(votingPower || '0') === 0}
                  whileHover={!isVoting && !hasVoted && parseFloat(votingPower || '0') > 0 ? { scale: 1.02, y: -2 } : {}}
                  whileTap={!isVoting && !hasVoted && parseFloat(votingPower || '0') > 0 ? { scale: 0.98 } : {}}
                >
                  <span className="button-icon">✓</span>
                  <span className="button-text">
                    {isVoting && voting[proposal.id] === 1 ? 'Voting...' : hasVoted ? '✓ Voted' : 'Vote YES'}
                  </span>
                </motion.button>
                <motion.button
                  className="vote-button vote-no"
                  onClick={() => handleVote(proposal.id, 0)}
                  disabled={isVoting || hasVoted || parseFloat(votingPower || '0') === 0}
                  whileHover={!isVoting && !hasVoted && parseFloat(votingPower || '0') > 0 ? { scale: 1.02, y: -2 } : {}}
                  whileTap={!isVoting && !hasVoted && parseFloat(votingPower || '0') > 0 ? { scale: 0.98 } : {}}
                >
                  <span className="button-icon">✗</span>
                  <span className="button-text">
                    {isVoting && voting[proposal.id] === 0 ? 'Voting...' : hasVoted ? '✗ Voted' : 'Vote NO'}
                  </span>
                </motion.button>
                <motion.button
                  className="vote-button vote-abstain"
                  onClick={() => handleVote(proposal.id, 2)}
                  disabled={isVoting || hasVoted || parseFloat(votingPower || '0') === 0}
                  whileHover={!isVoting && !hasVoted && parseFloat(votingPower || '0') > 0 ? { scale: 1.02, y: -2 } : {}}
                  whileTap={!isVoting && !hasVoted && parseFloat(votingPower || '0') > 0 ? { scale: 0.98 } : {}}
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
