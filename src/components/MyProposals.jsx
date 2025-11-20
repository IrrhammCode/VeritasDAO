import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useContracts } from '../hooks/useContracts'
import { useWallet } from '../contexts/WalletContext'
import { useToast } from '../contexts/ToastContext'
import { isSupportedNetwork, formatTimeRemaining } from '../utils/contractHelpers'
import ManageProposal from './ManageProposal'
import './MyProposals.css'

function MyProposals() {
  const { account, chainId } = useWallet()
  const { getAllProposals, isLoading: contractsLoading, contracts } = useContracts()
  const { error: showError } = useToast()
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedProposal, setSelectedProposal] = useState(null)
  const [showManage, setShowManage] = useState(false)

  useEffect(() => {
    if (contractsLoading || !account) return

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

    const fetchMyProposals = async () => {
      setLoading(true)
      setError(null)
      try {
        const allProposals = await getAllProposals()
        // Filter only proposals created by current user
        const myProposals = allProposals.filter(p => 
          p.proposer && p.proposer.toLowerCase() === account.toLowerCase()
        )
        setProposals(myProposals)
      } catch (error) {
        console.error('Error fetching proposals:', error)
        setError('Failed to load proposals. Please check your connection.')
      } finally {
        setLoading(false)
      }
    }

    fetchMyProposals()
    // Refresh every 30 seconds
    const interval = setInterval(fetchMyProposals, 30000)
    return () => clearInterval(interval)
  }, [getAllProposals, contractsLoading, chainId, contracts, account])

  const handleManage = (proposal) => {
    setSelectedProposal(proposal)
    setShowManage(true)
  }

  const handleCloseManage = () => {
    setShowManage(false)
    setSelectedProposal(null)
    // Refresh proposals
    if (contracts.governor && account) {
      getAllProposals().then(allProposals => {
        const myProposals = allProposals.filter(p => 
          p.proposer && p.proposer.toLowerCase() === account.toLowerCase()
        )
        setProposals(myProposals)
      })
    }
  }

  const formatAddress = (address) => {
    if (!address) return 'Unknown'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
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

  if (!account) {
    return (
      <section className="my-proposals-section">
        <div className="section-container">
          <div className="section-header">
            <h1 className="section-title">My Proposals</h1>
            <p className="section-description">Manage and update your proposals</p>
          </div>
          <div className="empty-state">Please connect your wallet to view your proposals</div>
        </div>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="my-proposals-section">
        <div className="section-container">
          <div className="section-header">
            <h1 className="section-title">My Proposals</h1>
            <p className="section-description">Manage and update your proposals</p>
          </div>
          <div className="loading-state">Loading your proposals...</div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="my-proposals-section">
        <div className="section-container">
          <div className="section-header">
            <h1 className="section-title">My Proposals</h1>
            <p className="section-description">Manage and update your proposals</p>
          </div>
          <div className="error-state">{error}</div>
        </div>
      </section>
    )
  }

  return (
    <section className="my-proposals-section">
      <div className="section-container">
        <div className="section-header">
          <h1 className="section-title">My Proposals</h1>
          <p className="section-description">Manage and update your proposals, share updates with voters and donors</p>
        </div>

        {proposals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>You haven't created any proposals yet</h3>
            <p>Create your first proposal to start managing it here</p>
          </div>
        ) : (
          <div className="my-proposals-grid">
            {proposals.map((proposal, index) => {
              const parsed = parseProposalDescription(proposal.description)
              const votesFor = parseFloat(proposal.votesFor || 0)
              const votesAgainst = parseFloat(proposal.votesAgainst || 0)
              const totalVotes = votesFor + votesAgainst
              const votesForPercent = totalVotes > 0 
                ? (votesFor / totalVotes) * 100 
                : 0
              const votesAgainstPercent = totalVotes > 0 
                ? (votesAgainst / totalVotes) * 100 
                : 0

              // Load proposal updates from localStorage
              const proposalUpdates = JSON.parse(
                localStorage.getItem(`proposal_updates_${proposal.id}`) || '{}'
              )
              const hasUpdates = proposalUpdates.status || proposalUpdates.news
              
              // Calculate total donations received for this proposal
              const allDonations = JSON.parse(localStorage.getItem('veritasDonations') || '[]')
              const proposalDonations = allDonations.filter(d => {
                const dProposalId = d.proposalId?.toString() || String(d.proposalId)
                const pId = proposal.id?.toString() || String(proposal.id)
                return dProposalId === pId && d.txHash && d.recipient
              })
              const totalDonationsReceived = proposalDonations.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0)
              const donationCount = proposalDonations.length
              
              // Get recipient address from proposal description or use proposer
              const description = proposal.description || ''
              let recipientAddress = proposal.proposer
              const lines = description.split('\n')
              for (const line of lines) {
                if (line.toLowerCase().includes('recipient')) {
                  const addressMatch = line.match(/0x[a-fA-F0-9]{40}/)
                  if (addressMatch) {
                    recipientAddress = addressMatch[0]
                    break
                  }
                }
              }
              
              // Check if current user is the recipient
              const isRecipient = account && recipientAddress && account.toLowerCase() === recipientAddress.toLowerCase()

              return (
                <motion.div
                  key={proposal.id}
                  className="my-proposal-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.01, y: -2 }}
                >
                  {/* Header */}
                  <div className="proposal-header">
                    <div className="proposal-id-wrapper">
                      <span className="proposal-id">
                        Proposal #{proposal.id.length > 20 ? `${proposal.id.slice(0, 10)}...${proposal.id.slice(-8)}` : proposal.id}
                      </span>
                    </div>
                    <div className={`proposal-status ${proposal.state.toLowerCase()}-badge`}>
                      <span className="status-dot"></span>
                      {proposal.state}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="proposal-title">
                    {parsed.title || `Proposal #${proposal.id.slice(0, 8)}...`}
                  </h3>

                  {/* Proposal Details */}
                  {(parsed.author || parsed.category || parsed.requestedAmount || parsed.estimatedDuration) && (
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
                            <span className="detail-label">Requested</span>
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
                  )}

                  {/* Meta Info */}
                  <div className="proposal-meta">
                    <div className="meta-item">
                      <span className="meta-label">Created by you</span>
                    </div>
                    {proposal.deadlineTimestamp && proposal.state === 'Active' && (
                      <div className="meta-item">
                        <span className="meta-icon">⏱️</span>
                        <span className="meta-value">{formatTimeRemaining(proposal.deadlineTimestamp)}</span>
                      </div>
                    )}
                  </div>

                  {/* Voting Progress */}
                  <div className="proposal-votes">
                    <div className="vote-progress-container">
                      {totalVotes > 0 ? (
                        <>
                          <div className="vote-bar">
                            {votesForPercent > 0 && (
                              <motion.div 
                                className="vote-bar-fill vote-for-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${votesForPercent}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                style={{ left: '0%' }}
                              />
                            )}
                            {votesAgainstPercent > 0 && (
                              <motion.div 
                                className="vote-bar-fill vote-against-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${votesAgainstPercent}%` }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                                style={{ left: `${votesForPercent}%` }}
                              />
                            )}
                          </div>
                          <div className="vote-stats">
                            <div className="vote-stat-item">
                              <span className="vote-icon vote-icon-for">✓</span>
                              <span className="votes-for">{votesFor.toFixed(2)} VERITAS</span>
                              <span className="vote-percent">{votesForPercent.toFixed(1)}%</span>
                            </div>
                            <div className="vote-stat-item">
                              <span className="vote-icon vote-icon-against">✗</span>
                              <span className="votes-against">{votesAgainst.toFixed(2)} VERITAS</span>
                              <span className="vote-percent">{votesAgainstPercent.toFixed(1)}%</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="vote-stats">
                          <div className="vote-stat-item">
                            <span className="vote-icon vote-icon-for">✓</span>
                            <span className="votes-for">0.00 VERITAS</span>
                            <span className="vote-percent">-</span>
                          </div>
                          <div className="vote-stat-item">
                            <span className="vote-icon vote-icon-against">✗</span>
                            <span className="votes-against">0.00 VERITAS</span>
                            <span className="vote-percent">-</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Donations Received */}
                  {totalDonationsReceived > 0 && isRecipient && (
                    <div className="donations-received-section">
                      <div className="donations-header">
                        <span className="donations-icon">💰</span>
                        <h4 className="donations-title">Donations Received</h4>
                      </div>
                      <div className="donations-info">
                        <div className="donation-amount-large">
                          <span className="donation-value-large">{totalDonationsReceived.toFixed(4)} ETH</span>
                          <span className="donation-label-small">{donationCount} {donationCount === 1 ? 'donation' : 'donations'}</span>
                        </div>
                        <div className="withdraw-info">
                          <span className="info-icon">ℹ️</span>
                          <span className="info-text">
                            Funds are in your wallet. You can withdraw them anytime.
                            {chainId === 11155111 && recipientAddress && (
                              <a 
                                href={`https://sepolia.etherscan.io/address/${recipientAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="etherscan-link"
                              >
                                View on Etherscan →
                              </a>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {hasUpdates && (
                    <div className="proposal-updates-badge">
                      <span className="updates-icon">📢</span>
                      <span>Has updates</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="proposal-actions">
                    <motion.button
                      className="manage-button"
                      onClick={() => handleManage(proposal)}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="button-icon">⚙️</span>
                      <span className="button-text">Manage Proposal</span>
                    </motion.button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {showManage && selectedProposal && (
        <ManageProposal
          proposal={selectedProposal}
          onClose={handleCloseManage}
        />
      )}
    </section>
  )
}

export default MyProposals

