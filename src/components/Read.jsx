import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useContracts } from '../hooks/useContracts'
import { useWallet } from '../contexts/WalletContext'
import { useToast } from '../contexts/ToastContext'
import { isSupportedNetwork, formatTimeRemaining } from '../utils/contractHelpers'
import './Read.css'

function Read({ onArticleClick }) {
  const { account, chainId } = useWallet()
  const { getAllProposals, contracts, isLoading: contractsLoading } = useContracts()
  const { error: showError } = useToast()
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [visibilityFilter, setVisibilityFilter] = useState('all') // all, public, early-access
  const [error, setError] = useState(null)

  // Check if user has access to a proposal
  const checkUserAccess = async (proposal, account) => {
    if (!account) return { hasAccess: false, isDonator: false, isVoter: false, votedFor: false }

    let isDonator = false
    let isVoter = false
    let votedFor = false

    // Check donations
    const savedDonations = JSON.parse(localStorage.getItem('veritasDonations') || '[]')
    const userDonations = savedDonations.filter(d => 
      d.proposalId === proposal.id && d.recipient && d.txHash
    )
    isDonator = userDonations.length > 0

    // Check votes
    try {
      const hasVoted = await contracts.governor.hasVoted(proposal.id, account)
      if (hasVoted) {
        isVoter = true
        // Check if voted "For"
        const voteFilter = contracts.governor.filters.VoteCast(account, proposal.id)
        const voteEvents = await contracts.governor.queryFilter(voteFilter)
        
        if (voteEvents.length > 0) {
          const voteEvent = voteEvents[voteEvents.length - 1]
          try {
            const iface = contracts.governor.interface
            const decoded = iface.decodeEventLog(
              'VoteCast',
              voteEvent.data,
              voteEvent.topics
            )
            votedFor = decoded.support === 1n
          } catch (parseError) {
            console.error('Error parsing vote event:', parseError)
          }
        }
      }
    } catch (voteError) {
      console.error('Error checking vote:', voteError)
    }

    const hasAccess = isDonator || (isVoter && votedFor)
    return { hasAccess, isDonator, isVoter, votedFor }
  }

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

    const fetchArticles = async () => {
      setLoading(true)
      setError(null)
      try {
        const allProposals = await getAllProposals()
        const accessibleArticles = []
        
        for (const proposal of allProposals) {
          try {
            // Normalize proposal ID (handle both string and number)
            const proposalId = proposal.id?.toString() || String(proposal.id)
            
            // Check read visibility preference
            const proposalSettings = JSON.parse(
              localStorage.getItem(`proposal_settings_${proposalId}`) || '{}'
            )
            
            // Also check from proposal description (for backward compatibility)
            let readVisibility = proposalSettings.readVisibility
            if (!readVisibility) {
              const description = proposal.description || ''
              const lines = description.split('\n')
              lines.forEach(line => {
                if (line.startsWith('Read Visibility:')) {
                  readVisibility = line.replace('Read Visibility:', '').trim()
                }
              })
            }

            // Debug logging
            console.log(`Proposal ${proposalId}: readVisibility=${readVisibility}, settings=`, proposalSettings)

            // Skip if visibility is 'none' or not set
            if (!readVisibility || readVisibility === 'none') {
              console.log(`Skipping proposal ${proposalId}: no read visibility set`)
              continue
            }

            // Parse proposal description first to get title, author, category
            const description = proposal.description || ''
            const lines = description.split('\n')
            
            let title = `Investigation Report #${proposal.id}`
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

            // Get news updates from localStorage
            const proposalUpdates = JSON.parse(
              localStorage.getItem(`proposal_updates_${proposalId}`) || '{}'
            )
            let newsUpdates = proposalUpdates.news || []

            console.log(`Proposal ${proposalId}: newsUpdates.length=${newsUpdates.length}, updates=`, proposalUpdates)

            // If no news updates but visibility is set, try to create article from articleContent
            if (newsUpdates.length === 0 && readVisibility) {
              // Check if articleContent was saved during proposal submission
              // It should be in the first news update if it exists
              const descriptionStart = description.indexOf('Description:')
              let content = descriptionStart !== -1 
                ? description.substring(descriptionStart + 12).trim()
                : description

              // Also check if there's articleContent saved separately
              // This happens when user submits proposal with readVisibility set
              if (!content || content.length < 50) {
                // Try to get from proposal settings or check if it was saved during submit
                const savedContent = proposalSettings.articleContent || proposalUpdates.articleContent
                console.log(`Proposal ${proposalId}: savedContent length=`, savedContent?.length)
                if (savedContent && savedContent.length >= 50) {
                  content = savedContent
                }
              }

              if (content && content.length >= 50) {
                // Create a default news update from content
                const defaultUpdate = {
                  title: title,
                  content: content,
                  earlyAccessOnly: readVisibility === 'early-access',
                  timestamp: proposalSettings.timestamp || Date.now(),
                  proposer: proposal.proposer
                }
                newsUpdates = [defaultUpdate] // Use array directly
                console.log(`Proposal ${proposalId}: Created default update from content`)
              } else {
                // If still no content, skip this proposal
                console.log(`Proposal ${proposalId}: No content found, skipping. Content length:`, content?.length)
                continue
              }
            }

            if (newsUpdates.length === 0) {
              console.log(`Proposal ${proposalId}: No news updates, skipping`)
              continue // Skip proposals without content
            }
            
            console.log(`Proposal ${proposalId}: Processing ${newsUpdates.length} news updates`)

            // Check user access
            const access = account ? await checkUserAccess(proposal, account) : { hasAccess: false, isDonator: false, isVoter: false, votedFor: false }

            // Process each news update
            for (const update of newsUpdates) {
              const isPublic = !update.earlyAccessOnly
              const canAccess = isPublic || access.hasAccess

              // Apply visibility filter
              if (visibilityFilter === 'public' && !isPublic) continue
              if (visibilityFilter === 'early-access' && isPublic) continue

              // For public articles, show preview; for early access, show full if user has access
              const content = canAccess 
                ? update.content 
                : update.content.substring(0, 200) + '...' // Preview for locked content

              accessibleArticles.push({
                id: `${proposalId}-${update.timestamp}`,
                proposalId: proposalId,
                title: update.title || title,
                author: author,
                category: category,
                content: content,
                excerpt: update.content.substring(0, 150) + '...',
                publishedDate: new Date(update.timestamp).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }),
                readTime: `${Math.ceil(update.content.length / 500)} min read`,
                status: proposal.state,
                isPublic: isPublic,
                hasAccess: canAccess,
                isDonator: access.isDonator,
                isVoter: access.isVoter,
                votedFor: access.votedFor,
                proposal: proposal, // Store full proposal for CTA
                update: update // Store full update
              })
            }
          } catch (err) {
            console.error(`Error processing proposal ${proposal.id}:`, err)
          }
        }

        // Sort by timestamp (newest first)
        accessibleArticles.sort((a, b) => b.update.timestamp - a.update.timestamp)
        setArticles(accessibleArticles)
      } catch (error) {
        console.error('Error fetching articles:', error)
        setError('Failed to load articles. Please check your connection.')
      } finally {
        setLoading(false)
      }
    }

    fetchArticles()
    // Refresh every 60 seconds
    const interval = setInterval(fetchArticles, 60000)
    return () => clearInterval(interval)
  }, [getAllProposals, contractsLoading, chainId, contracts, account, visibilityFilter])

  const categories = ['All', 'Environment', 'Health', 'Technology', 'Social Justice', 'Corruption', 'Other']
  
  const filteredArticles = selectedCategory === 'All' 
    ? articles 
    : articles.filter(article => article.category === selectedCategory)

  const handleDonateClick = (proposalId) => {
    // Navigate to donate page with proposal ID
    window.location.hash = '#donate'
    // Trigger event to open donate modal for this proposal
    window.dispatchEvent(new CustomEvent('donateToProposal', { detail: { proposalId } }))
  }

  const handleVoteClick = (proposalId) => {
    // Navigate to proposals page
    window.location.hash = '#proposals'
  }

  return (
    <section className="read-section">
      <div className="section-container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">Read</h2>
          <p className="section-description">
            Investigative journalism reports and updates. Public articles are free to read, 
            while early access content is available to supporters who voted "For" or donated.
          </p>
        </motion.div>

        {/* Visibility Filter */}
        <div className="read-visibility-filter">
          <motion.button
            className={`visibility-filter-button ${visibilityFilter === 'all' ? 'active' : ''}`}
            onClick={() => setVisibilityFilter('all')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            📚 All Articles
          </motion.button>
          <motion.button
            className={`visibility-filter-button ${visibilityFilter === 'public' ? 'active' : ''}`}
            onClick={() => setVisibilityFilter('public')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🌍 Public
          </motion.button>
          <motion.button
            className={`visibility-filter-button ${visibilityFilter === 'early-access' ? 'active' : ''}`}
            onClick={() => setVisibilityFilter('early-access')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            🔐 Early Access
          </motion.button>
        </div>

        {/* Category Filter */}
        {articles.length > 0 && (
          <div className="read-filter">
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

        {/* Articles Grid */}
        {loading ? (
          <div className="loading-state">
            <p>Loading articles...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="empty-icon">📖</div>
            <h3>No Articles Available</h3>
            <p>
              {visibilityFilter === 'early-access' 
                ? 'No early access articles available. Support investigations by voting "For" or donating to gain exclusive access.'
                : 'No articles available yet. Check back later for investigative reports.'}
            </p>
          </motion.div>
        ) : (
          <div className="articles-grid">
            {filteredArticles.map((article, index) => (
              <motion.article
                key={article.id}
                className="article-card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ y: -5 }}
              >
                <div className="article-header">
                  <span className="article-category">{article.category}</span>
                  <div className="article-status-group">
                    {article.isPublic ? (
                      <span className="article-badge public">🌍 Public</span>
                    ) : article.hasAccess ? (
                      <span className="article-badge early-access">🔐 Early Access</span>
                    ) : (
                      <span className="article-badge locked">🔒 Locked</span>
                    )}
                    {article.isDonator && (
                      <span className="article-badge donator">🚀 Donator</span>
                    )}
                    {article.isVoter && article.votedFor && (
                      <span className="article-badge voter">✓ Voter</span>
                    )}
                  </div>
                </div>

                <h3 className="article-title">{article.title}</h3>

                <div className="article-meta">
                  <span className="article-author">By {article.author}</span>
                  <span className="article-date">{article.publishedDate}</span>
                </div>

                <p className="article-excerpt">{article.excerpt}</p>

                {/* Locked Content CTA */}
                {!article.hasAccess && !article.isPublic && (
                  <div className="article-cta">
                    <div className="cta-content">
                      <span className="cta-icon">🔒</span>
                      <div className="cta-text">
                        <strong>Early Access Content</strong>
                        <p>Support this investigation to unlock full access</p>
                      </div>
                    </div>
                    <div className="cta-actions">
                      {article.proposal.state === 'Active' && (
                        <>
                          <motion.button
                            className="cta-button cta-vote"
                            onClick={() => handleVoteClick(article.proposalId)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Vote For
                          </motion.button>
                          <motion.button
                            className="cta-button cta-donate"
                            onClick={() => handleDonateClick(article.proposalId)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Donate
                          </motion.button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="article-footer">
                  <span className="read-time">{article.readTime}</span>
                  {article.hasAccess || article.isPublic ? (
                    <motion.button
                      className="read-button"
                      onClick={() => onArticleClick && onArticleClick(article.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Read Article →
                    </motion.button>
                  ) : (
                    <motion.button
                      className="read-button locked"
                      disabled
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      🔒 Locked
                    </motion.button>
                  )}
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default Read
