import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useContracts } from '../hooks/useContracts'
import { useWallet } from '../contexts/WalletContext'
import { isSupportedNetwork } from '../utils/contractHelpers'
import './Reports.css'

function Reports({ onReportClick }) {
  const { chainId, account } = useWallet()
  const { getAllProposals, contracts, isLoading: contractsLoading } = useContracts()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')
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
      setError('Governor contract not configured')
      setLoading(false)
      return
    }

    const fetchExecutedProposals = async () => {
      setLoading(true)
      setError(null)
      try {
        const allProposals = await getAllProposals()
        
        // Get proposals that user has donated to
        const donatedProposals = JSON.parse(localStorage.getItem('donatedProposals') || '[]')
        const donations = JSON.parse(localStorage.getItem('veritasDonations') || '[]')
        
        // Filter proposals:
        // 1. Executed/Succeeded proposals (public archive)
        // 2. Proposals that current user has donated to (personal archive)
        let filteredProposals = []
        
        if (account) {
          // Get proposals user donated to
          const userDonatedProposalIds = donations
            .filter(d => d.donor && d.donor.toLowerCase() === account.toLowerCase() && d.txHash)
            .map(d => d.proposalId)
          
          // Combine: executed proposals + user's donated proposals
          filteredProposals = allProposals.filter(p => {
            const proposalId = p.id?.toString() || String(p.id)
            const isExecuted = p.state === 'Executed' || p.state === 'Succeeded'
            const isDonated = userDonatedProposalIds.includes(proposalId) || 
                             userDonatedProposalIds.includes(proposalId.toString())
            return isExecuted || isDonated
          })
        } else {
          // If not logged in, only show executed proposals
          filteredProposals = allProposals.filter(p => 
            p.state === 'Executed' || p.state === 'Succeeded'
          )
        }

        // Convert filtered proposals to reports format
        const reportsData = filteredProposals.map((proposal, index) => {
          // Parse description to extract report info
          const description = proposal.description || ''
          const lines = description.split('\n')
          
          // Try to extract title, author, category from description
          let title = `Proposal #${proposal.id}`
          let author = 'Unknown'
          let category = 'Other'
          let excerpt = description.substring(0, 150) + '...'

          // Parse description format: "Funding Request: Title\n\nAuthor: ...\nCategory: ..."
          lines.forEach(line => {
            if (line.startsWith('Funding Request:')) {
              title = line.replace('Funding Request:', '').trim()
            } else if (line.startsWith('Author:')) {
              author = line.replace('Author:', '').trim()
            } else if (line.startsWith('Category:')) {
              category = line.replace('Category:', '').trim()
            }
          })

          // Extract excerpt from description
          const descriptionStart = description.indexOf('Description:')
          if (descriptionStart !== -1) {
            excerpt = description.substring(descriptionStart + 12).trim().substring(0, 150) + '...'
          }

          // Check if user donated to this proposal
          const donations = JSON.parse(localStorage.getItem('veritasDonations') || '[]')
          const userDonated = account && donations.some(d => 
            d.donor && 
            d.donor.toLowerCase() === account.toLowerCase() && 
            d.txHash &&
            (d.proposalId === proposal.id || d.proposalId?.toString() === proposal.id?.toString())
          )

          return {
            id: proposal.id,
            proposalId: proposal.id,
            title: title,
            author: author,
            category: category,
            excerpt: excerpt,
            publishedDate: new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            readTime: '5 min read',
            status: proposal.state === 'Executed' || proposal.state === 'Succeeded' ? 'Published' : 'In Progress',
            ipfsHash: null, // Will be added when IPFS integration is complete
            proposer: proposal.proposer,
            votesFor: proposal.votesFor,
            votesAgainst: proposal.votesAgainst,
            userDonated: userDonated || false,
            state: proposal.state
          }
        })

        setReports(reportsData)
      } catch (error) {
        console.error('Error fetching executed proposals:', error)
        setError('Failed to load reports. Please check your connection.')
      } finally {
        setLoading(false)
      }
    }

    fetchExecutedProposals()
    // Refresh every 60 seconds
    const interval = setInterval(fetchExecutedProposals, 60000)
    return () => clearInterval(interval)
  }, [getAllProposals, contractsLoading, chainId, contracts, selectedCategory])

  const categories = ['All', 'Environment', 'Health', 'Technology', 'Social Justice']
  
  const filteredReports = selectedCategory === 'All' 
    ? reports 
    : reports.filter(report => report.category === selectedCategory)

  return (
    <section className="reports-section">
      <div className="section-container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">Archive</h2>
          <p className="section-description">
            {account 
              ? 'Your donated proposals and all updates. View the complete progress of investigations you\'ve supported.'
              : 'All executed proposals and their outcomes. Connect your wallet to see proposals you\'ve donated to.'}
          </p>
        </motion.div>

        <motion.div
          className="archive-badge"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <span className="badge-icon">🔒</span>
          <div>
            <div className="badge-title">Permanent Archive</div>
            <div className="badge-subtitle">Stored on IPFS • Immutable • Decentralized</div>
          </div>
        </motion.div>

        {/* Category Filter */}
        {reports.length > 0 && (
          <div className="reports-filter">
            {categories.map((category) => (
              <motion.button
                key={category}
                className={`filter-button ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {category}
              </motion.button>
            ))}
          </div>
        )}

        {/* Reports Grid */}
        {loading ? (
          <div className="loading-state">
            <p>Loading published reports...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="empty-icon">📰</div>
            <h3>No Published Reports Yet</h3>
            <p>
              No proposals have been executed yet. Once proposals are approved, executed, and finalized, 
              they will appear here as published reports.
            </p>
          </motion.div>
        ) : (
          <div className="reports-grid">
            {filteredReports.map((report, index) => (
              <motion.article
                key={report.id}
                className="report-card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ y: -5, boxShadow: `0 10px 40px var(--glow-purple)` }}
              >
                <div className="report-header">
                  <span className="report-category">{report.category}</span>
                  <div className="report-status-group">
                    {report.userDonated && (
                      <span className="report-donated-badge">💝 You Donated</span>
                    )}
                    <span className="report-status">{report.status}</span>
                  </div>
                </div>

                <h3 className="report-title">{report.title}</h3>

                <div className="report-meta">
                  <span className="report-author">By {report.author}</span>
                  <span className="report-date">{report.publishedDate}</span>
                </div>

                <p className="report-excerpt">{report.excerpt}</p>

                <div className="report-footer">
                  <span className="read-time">{report.readTime}</span>
                  <motion.button
                    className="read-button"
                    onClick={() => onReportClick(report.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Read Full Report →
                  </motion.button>
                </div>

                <div className="report-ipfs-badge">
                  <span className="ipfs-icon">🌐</span>
                  <span>IPFS: {report.ipfsHash ? `${report.ipfsHash.slice(0, 10)}...` : 'Loading...'}</span>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default Reports

