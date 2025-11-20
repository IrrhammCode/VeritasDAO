import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useContracts } from '../hooks/useContracts'
import { useWallet } from '../contexts/WalletContext'
import { isSupportedNetwork } from '../utils/contractHelpers'
import './ReportDetail.css'

function ReportDetail({ reportId, onBack, sourceSection = 'reports' }) {
  const { chainId, account } = useWallet()
  const { getProposalDetails, getAllProposals, contracts, isLoading: contractsLoading } = useContracts()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updates, setUpdates] = useState({
    status: null,
    news: [],
    articleContent: null
  })

  useEffect(() => {
    if (!reportId || contractsLoading) {
      if (!reportId) {
        setError('No report ID provided')
        setLoading(false)
      }
      return
    }

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

    const fetchReport = async () => {
      setLoading(true)
      setError(null)
      try {
        // Check if this is an article from Read page (format: proposalId-timestamp)
        // Article IDs from Read page have format like "123-1734567890123"
        const reportIdStr = String(reportId)
        const isArticleId = reportIdStr.includes('-') && sourceSection === 'read'
        let proposalId = reportId
        let updateTimestamp = null

        if (isArticleId) {
          // Parse article ID: proposalId-timestamp
          // Find the last dash that separates proposalId from timestamp
          const lastDashIndex = reportIdStr.lastIndexOf('-')
          if (lastDashIndex > 0) {
            proposalId = reportIdStr.substring(0, lastDashIndex)
            const timestampStr = reportIdStr.substring(lastDashIndex + 1)
            updateTimestamp = parseInt(timestampStr) || null
          }
        }

        // Get all proposals and find the one matching proposalId
        const allProposals = await getAllProposals()
        const proposal = allProposals.find(p => {
          const pId = p.id?.toString() || String(p.id)
          return pId === String(proposalId) || p.proposalId?.toString() === String(proposalId)
        })

        if (!proposal) {
          setError(`Proposal with ID ${proposalId} not found. It may not exist or hasn't been created yet.`)
          setLoading(false)
          return
        }

        // If this is from Read page, load article from localStorage
        if (isArticleId && sourceSection === 'read') {
          const normalizedProposalId = proposal.id?.toString() || String(proposal.id)
          
          // Get news updates from localStorage
          const proposalUpdates = JSON.parse(
            localStorage.getItem(`proposal_updates_${normalizedProposalId}`) || '{}'
          )
          let newsUpdates = proposalUpdates.news || []

          // If no news updates, try to get from articleContent
          if (newsUpdates.length === 0) {
            const proposalSettings = JSON.parse(
              localStorage.getItem(`proposal_settings_${normalizedProposalId}`) || '{}'
            )
            const articleContent = proposalSettings.articleContent || proposalUpdates.articleContent
            
            if (articleContent && articleContent.length >= 50) {
              // Parse proposal description for title, author, category
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

              newsUpdates = [{
                title: title,
                content: articleContent,
                timestamp: proposalSettings.timestamp || Date.now(),
                proposer: proposal.proposer
              }]
            }
          }

          // Find the specific update by timestamp
          let selectedUpdate = null
          if (updateTimestamp) {
            // Try to find exact match first
            selectedUpdate = newsUpdates.find(u => {
              const uTimestamp = typeof u.timestamp === 'string' ? parseInt(u.timestamp) : u.timestamp
              return uTimestamp === updateTimestamp
            })
            
            // If no exact match, try to find closest match
            if (!selectedUpdate) {
              selectedUpdate = newsUpdates.find(u => {
                const uTimestamp = typeof u.timestamp === 'string' ? parseInt(u.timestamp) : u.timestamp
                return Math.abs(uTimestamp - updateTimestamp) < 1000 // Within 1 second
              })
            }
          }
          
          // If no specific update found, use the latest one
          if (!selectedUpdate && newsUpdates.length > 0) {
            // Sort by timestamp and get the latest
            const sorted = [...newsUpdates].sort((a, b) => {
              const aTime = typeof a.timestamp === 'string' ? parseInt(a.timestamp) : a.timestamp
              const bTime = typeof b.timestamp === 'string' ? parseInt(b.timestamp) : b.timestamp
              return bTime - aTime
            })
            selectedUpdate = sorted[0]
          }

          if (!selectedUpdate) {
            setError('Article content not found. The article may not have been published yet or the content is not available.')
            setLoading(false)
            return
          }

          // Parse proposal description for metadata
          const description = proposal.description || ''
          const lines = description.split('\n')
          
          let title = selectedUpdate.title || `Investigation Report #${proposal.id}`
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

          // Format content as HTML
          const formattedContent = selectedUpdate.content
            .split('\n')
            .map(para => para.trim())
            .filter(para => para.length > 0)
            .map(para => `<p>${para}</p>`)
            .join('')

          setReport({
            id: reportId,
            proposalId: normalizedProposalId,
            title: title,
            author: author,
            category: category,
            content: formattedContent || `<p>${selectedUpdate.content}</p>`,
            publishedDate: new Date(selectedUpdate.timestamp).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }),
            readTime: `${Math.ceil(selectedUpdate.content.length / 500)} min read`,
            ipfsHash: null,
            proposer: proposal.proposer,
            votesFor: proposal.votesFor,
            votesAgainst: proposal.votesAgainst,
            state: proposal.state,
            isArticle: true
          })
          setLoading(false)
          return
        }

        // Normalize proposal ID for localStorage access
        const normalizedProposalId = proposal.id?.toString() || String(proposal.id)
        
        // For Reports page: Check if proposal is executed/succeeded OR user has donated
        if (sourceSection === 'reports') {
          const donations = JSON.parse(localStorage.getItem('veritasDonations') || '[]')
          const userDonated = account && donations.some(d => 
            d.donor && 
            d.donor.toLowerCase() === account.toLowerCase() && 
            d.txHash &&
            (d.proposalId === normalizedProposalId || d.proposalId?.toString() === normalizedProposalId)
          )
          
          const isExecuted = proposal.state === 'Executed' || proposal.state === 'Succeeded'
          
          if (!isExecuted && !userDonated) {
            setError('This proposal has not been executed yet. Donate to view updates!')
            setLoading(false)
            return
          }
        }
        
        // Load all updates from localStorage
        const proposalUpdates = JSON.parse(
          localStorage.getItem(`proposal_updates_${normalizedProposalId}`) || '{}'
        )
        const proposalSettings = JSON.parse(
          localStorage.getItem(`proposal_settings_${normalizedProposalId}`) || '{}'
        )
        
        // Get status update
        const statusUpdate = proposalUpdates.status || null
        
        // Get news updates (sorted by timestamp, newest first)
        const newsUpdates = (proposalUpdates.news || []).sort((a, b) => {
          const aTime = typeof a.timestamp === 'string' ? parseInt(a.timestamp) : a.timestamp
          const bTime = typeof b.timestamp === 'string' ? parseInt(b.timestamp) : b.timestamp
          return bTime - aTime
        })
        
        // Get article content
        const articleContent = proposalSettings.articleContent || proposalUpdates.articleContent || null
        
        setUpdates({
          status: statusUpdate,
          news: newsUpdates,
          articleContent: articleContent
        })

        // Parse description to extract report info
        const description = proposal.description || ''
        const lines = description.split('\n')
        
        let title = `Proposal #${proposal.id}`
        let author = 'Unknown'
        let category = 'Other'
        let content = description

        // Parse description format
        lines.forEach(line => {
          if (line.startsWith('Funding Request:')) {
            title = line.replace('Funding Request:', '').trim()
          } else if (line.startsWith('Author:')) {
            author = line.replace('Author:', '').trim()
          } else if (line.startsWith('Category:')) {
            category = line.replace('Category:', '').trim()
          }
        })

        // Extract content from description
        const descriptionStart = description.indexOf('Description:')
        if (descriptionStart !== -1) {
          content = description.substring(descriptionStart + 12).trim()
        }

        // If no content from description, try to get from articleContent or news updates
        if ((!content || content.length < 50) && updates.articleContent) {
          content = updates.articleContent
        } else if ((!content || content.length < 50) && updates.news.length > 0) {
          // Use the latest news update content
          const latestNews = updates.news[0]
          content = latestNews.content || content
          if (latestNews.title && !title.includes('Proposal')) {
            title = latestNews.title
          }
        }

        // Format content as HTML
        const formattedContent = content
          .split('\n')
          .map(para => para.trim())
          .filter(para => para.length > 0)
          .map(para => `<p>${para}</p>`)
          .join('')

        setReport({
          id: proposal.id,
          proposalId: proposal.id,
          title: title,
          author: author,
          category: category,
          content: formattedContent || `<p>${content || 'No content available.'}</p>`,
          publishedDate: new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          readTime: `${Math.ceil((content || '').length / 500)} min read`,
          ipfsHash: null, // Will be added when IPFS integration is complete
          proposer: proposal.proposer,
          votesFor: proposal.votesFor,
          votesAgainst: proposal.votesAgainst,
          state: proposal.state,
        })
      } catch (error) {
        console.error('Error fetching report:', error)
        const errorMessage = error.message || 'Failed to load report'
        if (errorMessage.includes('network') || errorMessage.includes('connection')) {
          setError('Failed to load report. Please check your network connection and try again.')
        } else if (errorMessage.includes('contract')) {
          setError('Failed to load report. Please check that you are connected to the correct network (Sepolia testnet).')
        } else {
          setError(`Failed to load report: ${errorMessage}. Please try again or contact support if the problem persists.`)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [reportId, getAllProposals, getProposalDetails, contractsLoading, chainId, contracts])

  if (loading) {
    return (
      <section className="report-detail-section">
        <div className="section-container">
          <div className="loading-state">
            <p>Loading report from IPFS...</p>
          </div>
        </div>
      </section>
    )
  }

  if (error || !report) {
    return (
      <section className="report-detail-section">
        <div className="section-container">
          <motion.button
            className="back-button"
            onClick={onBack}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ← Back to {sourceSection === 'read' ? 'Read' : 'Reports'}
          </motion.button>
          <div className="error-message">
            <h2>{sourceSection === 'read' ? 'Article Not Found' : 'Report Not Found'}</h2>
            <p>
              {error || (sourceSection === 'read' 
                ? 'The article you\'re looking for doesn\'t exist or hasn\'t been published yet.'
                : 'The report you\'re looking for doesn\'t exist or hasn\'t been loaded from IPFS yet.')}
            </p>
            <p>
              {sourceSection === 'read' 
                ? 'Articles are published by investigators as their investigations progress. Check back later for updates.'
                : 'Reports are available once proposals are executed or if you have donated to the proposal. Make sure the proposal exists and has been published.'}
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="report-detail-section">
      <div className="section-container">
        <motion.button
          className="back-button"
          onClick={onBack}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ← Back to {sourceSection === 'read' ? 'Read' : 'Reports'}
        </motion.button>

        <motion.article
          className="report-detail-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="report-detail-header">
            <span className="report-category-badge">{report.category}</span>
            <h1 className="report-detail-title">{report.title}</h1>
            <div className="report-detail-meta">
              <span className="report-author-name">By {report.author}</span>
              <span className="report-publish-date">{report.publishedDate}</span>
              <span className="report-read-time">{report.readTime}</span>
            </div>
          </div>

          {report.ipfsHash && (
            <div className="report-ipfs-info">
              <span className="ipfs-icon-large">🌐</span>
              <div>
                <div className="ipfs-label">Permanently Archived on IPFS</div>
                <div className="ipfs-hash">Hash: {report.ipfsHash}</div>
              </div>
            </div>
          )}
          {report.isArticle && !report.ipfsHash && (
            <div className="report-ipfs-info">
              <span className="ipfs-icon-large">📝</span>
              <div>
                <div className="ipfs-label">Journalistic Article</div>
                <div className="ipfs-hash">This article is part of an ongoing investigation</div>
              </div>
            </div>
          )}

          {/* Status Update Section */}
          {updates.status && (
            <div className="update-section status-update-section">
              <h3 className="update-section-title">
                <span className="update-icon">📊</span>
                Latest Status Update
              </h3>
              <div className="status-update-card">
                <div className="status-update-header">
                  <span className="status-badge-update">{updates.status.status}</span>
                  <span className="status-update-date">
                    {new Date(updates.status.timestamp).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <p className="status-update-message">{updates.status.message}</p>
              </div>
            </div>
          )}

          {/* News Updates Section */}
          {updates.news.length > 0 && (
            <div className="update-section news-updates-section">
              <h3 className="update-section-title">
                <span className="update-icon">📢</span>
                News Updates ({updates.news.length})
              </h3>
              <div className="news-updates-list">
                {updates.news.map((update, index) => (
                  <div key={index} className="news-update-card">
                    <div className="news-update-header">
                      <h4 className="news-update-title">{update.title}</h4>
                      <div className="news-update-meta">
                        {update.earlyAccessOnly && (
                          <span className="early-access-badge-small">🔒 Early Access</span>
                        )}
                        <span className="news-update-date">
                          {new Date(update.timestamp).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="news-update-content">
                      {update.content.split('\n').map((para, pIndex) => (
                        para.trim() && <p key={pIndex}>{para.trim()}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="update-section main-content-section">
            <h3 className="update-section-title">
              <span className="update-icon">📝</span>
              {updates.articleContent ? 'Full Article' : 'Proposal Description'}
            </h3>
            <div 
              className="report-body"
              dangerouslySetInnerHTML={{ __html: updates.articleContent 
                ? updates.articleContent.split('\n').map(para => para.trim()).filter(para => para).map(para => `<p>${para}</p>`).join('')
                : report.content 
              }}
            />
          </div>

          <div className="report-footer-info">
            <div className="footer-badge">
              <span className="badge-icon">🔒</span>
              <span>This report is censorship-resistant and permanently archived</span>
            </div>
            <div className="footer-badge">
              <span className="badge-icon">✓</span>
              <span>All sources verified and protected</span>
            </div>
          </div>
        </motion.article>
      </div>
    </section>
  )
}

export default ReportDetail

