import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useContracts } from '../hooks/useContracts'
import { useWallet } from '../contexts/WalletContext'
import { useToast } from '../contexts/ToastContext'
import { getContractAddresses } from '../config/contracts'
import { isSupportedNetwork, formatTimeRemaining } from '../utils/contractHelpers'
import './Proposals.css'

function Proposals() {
  const { account, chainId } = useWallet()
  const { getAllProposals, vote, isLoading: contractsLoading, contracts } = useContracts()
  const { success, error: showError } = useToast()
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState({})
  const [filter, setFilter] = useState('all') // all, active, succeeded, defeated
  const [error, setError] = useState(null)

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
      const addresses = getContractAddresses(chainId)
      const errorMsg = addresses.VeritasGovernor 
        ? `Governor contract not accessible at ${addresses.VeritasGovernor}. Please check:\n1. Contract is deployed on current network\n2. Network matches (Sepolia: 11155111, Localhost: 1337)\n3. Restart dev server after updating .env file`
        : 'Governor contract not configured. Please set VITE_GOVERNOR_ADDRESS in .env file and restart dev server'
      setError(errorMsg)
      setLoading(false)
      return
    }

    const fetchProposals = async () => {
      setLoading(true)
      setError(null)
      try {
        const allProposals = await getAllProposals()
        setProposals(allProposals)
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
  }, [getAllProposals, contractsLoading, chainId, contracts, filter])

  const handleVote = async (proposalId, voteType) => {
    if (!account) {
      showError('Please connect your wallet to vote')
      return
    }

    // Check if user is proposer
    const proposal = proposals.find(p => p.id === proposalId)
    if (proposal && proposal.proposer && account.toLowerCase() === proposal.proposer.toLowerCase()) {
      showError('You cannot vote on your own proposal')
      return
    }

    // Convert voteType to support: 'for' = 1, 'against' = 0
    const support = voteType === 'for' ? 1 : 0
    setVoting(prev => ({ ...prev, [proposalId]: support }))

    try {
      const txHash = await vote(proposalId, support)
      success(`Vote submitted! Transaction: ${txHash.slice(0, 10)}...`)
      
      // Track voter in localStorage for early access
      const allVotes = JSON.parse(localStorage.getItem('proposal_votes') || '[]')
      const voteRecord = {
        proposalId: proposalId,
        voter: account,
        support: support,
        timestamp: Date.now(),
        txHash: txHash
      }
      // Remove existing vote for this proposal from this voter
      const filteredVotes = allVotes.filter(v => 
        !(v.proposalId === proposalId && v.voter.toLowerCase() === account.toLowerCase())
      )
      filteredVotes.push(voteRecord)
      localStorage.setItem('proposal_votes', JSON.stringify(filteredVotes))
      
      // Refresh proposals after vote
      setTimeout(async () => {
        const allProposals = await getAllProposals()
        setProposals(allProposals)
      }, 2000)
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

  const formatAddress = (address) => {
    if (!address) return 'Unknown'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const filteredProposals = proposals.filter(p => {
    if (filter === 'all') return true
    return p.state.toLowerCase() === filter.toLowerCase()
  })

  if (loading) {
    return (
      <section className="proposals-section">
        <div className="section-container">
          <div className="section-header">
            <h1 className="section-title">Proposals</h1>
            <p className="section-description">View and vote on all governance proposals</p>
          </div>
          <div className="loading-state">Loading proposals...</div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="proposals-section">
        <div className="section-container">
          <div className="section-header">
            <h1 className="section-title">Proposals</h1>
            <p className="section-description">View and vote on all governance proposals</p>
          </div>
          <div className="error-state">{error}</div>
        </div>
      </section>
    )
  }

  return (
    <section className="proposals-section">
      <div className="section-container">
        <div className="section-header">
          <h1 className="section-title">Proposals</h1>
          <p className="section-description">View and vote on all governance proposals</p>
        </div>

        {/* Filter */}
        <div className="proposals-filter">
          <button
            className={`filter-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-button ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button
            className={`filter-button ${filter === 'succeeded' ? 'active' : ''}`}
            onClick={() => setFilter('succeeded')}
          >
            Succeeded
          </button>
          <button
            className={`filter-button ${filter === 'defeated' ? 'active' : ''}`}
            onClick={() => setFilter('defeated')}
          >
            Defeated
          </button>
        </div>

        {filteredProposals.length === 0 ? (
          <div className="empty-state">No proposals found.</div>
        ) : (
          <div className="proposals-grid">
            {filteredProposals.map((proposal, index) => {
              const totalVotes = parseFloat(proposal.votesFor) + parseFloat(proposal.votesAgainst)
              const votesForPercent = totalVotes > 0 
                ? (parseFloat(proposal.votesFor) / totalVotes) * 100 
                : 0
              const isVoting = voting[proposal.id] !== undefined
              const hasVoted = proposal.hasVoted
              
              // Check if current user is the proposer
              const isProposer = account && proposal.proposer && 
                account.toLowerCase() === proposal.proposer.toLowerCase()

              return (
                <motion.div
                  key={proposal.id}
                  className="proposal-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                >
                  <div className="proposal-header">
                    <div className="proposal-id">Proposal #{proposal.id.padStart(3, '0')}</div>
                    <div className={`proposal-status ${proposal.state.toLowerCase()}-badge`}>
                      {proposal.state}
                    </div>
                  </div>

                  <h3 className="proposal-title">
                    {proposal.description || `Proposal #${proposal.id}`}
                  </h3>

                  <div className="proposal-meta">
                    <span className="proposal-author">Proposer: {formatAddress(proposal.proposer)}</span>
                  </div>

                  <div className="proposal-votes">
                    <div className="vote-progress-container">
                      <div className="vote-bar">
                        <motion.div 
                          className="vote-bar-fill vote-for-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${votesForPercent}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                        <motion.div 
                          className="vote-bar-fill vote-against-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${100 - votesForPercent}%` }}
                          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                          style={{ marginLeft: 'auto' }}
                        />
                      </div>
                      <div className="vote-stats">
                        <div className="vote-stat-item">
                          <span className="vote-icon vote-icon-for">✓</span>
                          <span className="votes-for">{parseFloat(proposal.votesFor).toFixed(2)} VERITAS</span>
                          <span className="vote-percent">{votesForPercent.toFixed(1)}%</span>
                        </div>
                        <div className="vote-stat-item">
                          <span className="vote-icon vote-icon-against">✗</span>
                          <span className="votes-against">{parseFloat(proposal.votesAgainst).toFixed(2)} VERITAS</span>
                          <span className="vote-percent">{(100 - votesForPercent).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                    {proposal.deadlineTimestamp && proposal.state === 'Active' && (
                      <div className="proposal-timer">
                        <span className="timer-icon">⏱️</span>
                        <span className="timer-text">
                          {formatTimeRemaining(proposal.deadlineTimestamp)}
                        </span>
                      </div>
                    )}
                  </div>

                  {proposal.state === 'Active' && (
                    <div className="proposal-actions">
                      {isProposer ? (
                        <div className="proposer-notice">
                          <span className="notice-icon">ℹ️</span>
                          <span className="notice-text">You created this proposal. Go to "My Proposals" to manage it.</span>
                        </div>
                      ) : (
                        <>
                          <motion.button
                            className="vote-button vote-for"
                            onClick={() => handleVote(proposal.id, 'for')}
                            disabled={isVoting || hasVoted}
                            whileHover={!isVoting && !hasVoted ? { scale: 1.05, y: -2 } : {}}
                            whileTap={!isVoting && !hasVoted ? { scale: 0.95 } : {}}
                          >
                            <span className="button-icon">✓</span>
                            <span className="button-text">
                              {isVoting && voting[proposal.id] === 1 ? 'Voting...' : hasVoted ? '✓ Voted' : 'Vote For'}
                            </span>
                          </motion.button>
                          <motion.button
                            className="vote-button vote-against"
                            onClick={() => handleVote(proposal.id, 'against')}
                            disabled={isVoting || hasVoted}
                            whileHover={!isVoting && !hasVoted ? { scale: 1.05, y: -2 } : {}}
                            whileTap={!isVoting && !hasVoted ? { scale: 0.95 } : {}}
                          >
                            <span className="button-icon">✗</span>
                            <span className="button-text">
                              {isVoting && voting[proposal.id] === 0 ? 'Voting...' : hasVoted ? '✗ Voted' : 'Vote Against'}
                            </span>
                          </motion.button>
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default Proposals
