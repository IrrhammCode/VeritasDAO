import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useContracts } from '../hooks/useContracts'
import { useWallet } from '../contexts/WalletContext'
import { useToast } from '../contexts/ToastContext'
import { isSupportedNetwork, formatTimeRemaining } from '../utils/contractHelpers'
import DonateModal from './DonateModal'
import './Donate.css'

function Donate() {
  const { account, chainId } = useWallet()
  const { getAllProposals, isLoading: contractsLoading, contracts } = useContracts()
  const { error: showError } = useToast()
  
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [donateModalOpen, setDonateModalOpen] = useState(false)
  const [selectedProposalForDonate, setSelectedProposalForDonate] = useState(null)
  const [donations, setDonations] = useState({}) // Track donations per proposal
  const [sortBy, setSortBy] = useState('newest') // newest, donations, votes

  // Load donations from localStorage
  useEffect(() => {
    const loadDonations = () => {
      const savedDonations = JSON.parse(localStorage.getItem('veritasDonations') || '[]')
      
      const donationsMap = {}
      savedDonations.forEach(donation => {
        // Ensure proposalId is string for consistency
        const proposalId = String(donation.proposalId)
        if (!donationsMap[proposalId]) {
          donationsMap[proposalId] = []
        }
        donationsMap[proposalId].push(donation)
      })
      
      setDonations(donationsMap)
    }
    
    loadDonations()
    
    // Listen for storage changes (when donation is saved in another tab/window)
    const handleStorageChange = (e) => {
      if (e.key === 'veritasDonations') {
        loadDonations()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

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
        // Filter only active proposals (can be donated to)
        const activeProposals = allProposals.filter(p => 
          p.state === 'Active' || p.state === 'Succeeded' || p.state === 'Pending'
        )
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

  const handleDonateClick = (proposal) => {
    setSelectedProposalForDonate(proposal)
    setDonateModalOpen(true)
  }

  const handleDonateClose = () => {
    setDonateModalOpen(false)
    setSelectedProposalForDonate(null)
    
    // Force reload donations from localStorage
    const reloadDonations = () => {
      const savedDonations = JSON.parse(localStorage.getItem('veritasDonations') || '[]')
      
      const donationsMap = {}
      savedDonations.forEach(donation => {
        // Ensure proposalId is string for consistency
        const proposalId = String(donation.proposalId)
        if (!donationsMap[proposalId]) {
          donationsMap[proposalId] = []
        }
        donationsMap[proposalId].push(donation)
      })
      
      // Log summary
      Object.keys(donationsMap).forEach(proposalId => {
        const total = donationsMap[proposalId].reduce((sum, d) => sum + parseFloat(d.amount || 0), 0)
      })
      
      setDonations(donationsMap)
    }
    
    // Reload immediately
    reloadDonations()
    
    // Also reload after a short delay to ensure localStorage is fully written
    setTimeout(() => {
      reloadDonations()
    }, 500)
  }

  const getTotalDonations = (proposalId) => {
    // Ensure proposalId is string for consistency
    const id = String(proposalId)
    if (!donations[id] || donations[id].length === 0) {
      return 0
    }
    const total = donations[id].reduce((sum, d) => sum + parseFloat(d.amount || 0), 0)
    return total
  }

  const getDonationCount = (proposalId) => {
    // Ensure proposalId is string for consistency
    const id = String(proposalId)
    if (!donations[id]) return 0
    return donations[id].length
  }

  const hasDonated = (proposalId) => {
    if (!account) return false
    // Ensure proposalId is string for consistency
    const id = String(proposalId)
    if (!donations[id]) return false
    return donations[id].some(d => 
      d.donor && 
      d.donor.toLowerCase() === account.toLowerCase() && 
      d.txHash
    )
  }

  const formatAddress = (address) => {
    if (!address) return 'Unknown'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Sort proposals
  const sortedProposals = [...proposals].sort((a, b) => {
    switch (sortBy) {
      case 'donations':
        return getTotalDonations(b.id) - getTotalDonations(a.id)
      case 'votes':
        return (parseFloat(b.votesFor) + parseFloat(b.votesAgainst)) - 
               (parseFloat(a.votesFor) + parseFloat(a.votesAgainst))
      case 'newest':
      default:
        return parseInt(b.id) - parseInt(a.id)
    }
  })

  // Calculate total donations across all proposals
  const totalDonations = Object.values(donations).reduce((sum, proposalDonations) => {
    return sum + proposalDonations.reduce((s, d) => s + parseFloat(d.amount || 0), 0)
  }, 0)

  const totalDonationCount = Object.values(donations).reduce((sum, proposalDonations) => {
    return sum + proposalDonations.length
  }, 0)

  if (loading) {
    return (
      <section className="donate-section">
        <div className="section-container">
          <div className="loading-state">Loading proposals...</div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="donate-section">
        <div className="section-container">
          <div className="error-state">{error}</div>
        </div>
      </section>
    )
  }

  return (
    <section className="donate-section">
      <div className="section-container">
        {/* Header */}
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="section-title">Support Investigations</h1>
          <p className="section-description">
            Donate directly to investigators and get early access to their findings
          </p>
        </motion.div>

        {/* Stats Banner */}
        <motion.div
          className="donate-stats-banner"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-value">{totalDonations.toFixed(3)} ETH</div>
              <div className="stat-label">Total Donated</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-value">{totalDonationCount}</div>
              <div className="stat-label">Total Donors</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <div className="stat-value">{proposals.length}</div>
              <div className="stat-label">Active Proposals</div>
            </div>
          </div>
        </motion.div>

        {/* Sort Filter */}
        {proposals.length > 0 && (
          <motion.div
            className="donate-sort"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <label className="sort-label">Sort by:</label>
            <div className="sort-buttons">
              <button
                className={`sort-button ${sortBy === 'newest' ? 'active' : ''}`}
                onClick={() => setSortBy('newest')}
              >
                Newest
              </button>
              <button
                className={`sort-button ${sortBy === 'donations' ? 'active' : ''}`}
                onClick={() => setSortBy('donations')}
              >
                Most Donated
              </button>
              <button
                className={`sort-button ${sortBy === 'votes' ? 'active' : ''}`}
                onClick={() => setSortBy('votes')}
              >
                Most Votes
              </button>
            </div>
          </motion.div>
        )}

        {/* Proposals Grid */}
        {sortedProposals.length === 0 ? (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="empty-icon">💝</div>
            <h3>No Active Proposals</h3>
            <p>There are no active proposals to donate to at the moment. Check back later!</p>
          </motion.div>
        ) : (
          <div className="donate-proposals-grid">
            {sortedProposals.map((proposal, index) => {
              const totalVotes = parseFloat(proposal.votesFor || 0) + parseFloat(proposal.votesAgainst || 0)
              const votesForPercent = totalVotes > 0 
                ? (parseFloat(proposal.votesFor || 0) / totalVotes) * 100 
                : 0
              // Ensure proposalId is string for consistency
              const proposalId = String(proposal.id)
              const totalDonated = getTotalDonations(proposalId)
              const donationCount = getDonationCount(proposalId)
              const userDonated = hasDonated(proposalId)

              // Parse proposal title from description
              const description = proposal.description || ''
              const lines = description.split('\n')
              let title = `Proposal #${proposal.id}`
              let author = 'Unknown'
              let category = 'Other'
              
              lines.forEach(line => {
                if (line.startsWith('Funding Request:')) {
                  title = line.replace('Funding Request:', '').trim()
                } else if (line.startsWith('Author:')) {
                  author = line.replace('Author:', '').trim()
                } else if (line.startsWith('Category:')) {
                  category = line.replace('Category:', '').trim()
                }
              })

              return (
                <motion.div
                  key={proposal.id}
                  className="donate-proposal-card"
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

                  <h3 className="proposal-title">{title}</h3>

                  <div className="proposal-meta">
                    <span className="proposal-author">By {author}</span>
                    <span className="proposal-category">{category}</span>
                  </div>

                  {/* Donation Stats */}
                  <div className="donation-highlight">
                    <div className="donation-amount-large">
                      <span className="donation-icon-large">💰</span>
                      <div>
                        <div className="donation-value">{totalDonated.toFixed(3)} ETH</div>
                        <div className="donation-label">
                          {donationCount} {donationCount === 1 ? 'donation' : 'donations'}
                        </div>
                      </div>
                    </div>
                    {userDonated && (
                      <div className="user-donated-badge">
                        ✓ You donated
                      </div>
                    )}
                  </div>

                  {/* Voting Progress */}
                  <div className="proposal-votes">
                    <div className="vote-bar">
                      <div 
                        className="vote-bar-fill"
                        style={{ width: `${votesForPercent}%` }}
                      />
                    </div>
                    <div className="vote-stats">
                      <span className="votes-for">✓ {parseFloat(proposal.votesFor).toFixed(2)} For</span>
                      <span className="votes-against">✗ {parseFloat(proposal.votesAgainst).toFixed(2)} Against</span>
                    </div>
                  </div>

                  {/* Donate Button */}
                  <motion.button
                    className="donate-primary-button"
                    onClick={() => handleDonateClick(proposal)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="button-icon">💝</span>
                    <span>Donate Now</span>
                  </motion.button>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Donate Modal */}
      <DonateModal
        proposal={selectedProposalForDonate}
        isOpen={donateModalOpen}
        onClose={handleDonateClose}
        onDonationSuccess={() => {
          // Force reload donations immediately after successful donation
          const savedDonations = JSON.parse(localStorage.getItem('veritasDonations') || '[]')
          const donationsMap = {}
          savedDonations.forEach(donation => {
            const proposalId = String(donation.proposalId)
            if (!donationsMap[proposalId]) {
              donationsMap[proposalId] = []
            }
            donationsMap[proposalId].push(donation)
          })
          setDonations(donationsMap)
        }}
      />
    </section>
  )
}

export default Donate

