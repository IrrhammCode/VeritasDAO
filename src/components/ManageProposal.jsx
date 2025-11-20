import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '../contexts/WalletContext'
import { useToast } from '../contexts/ToastContext'
import './ManageProposal.css'

function ManageProposal({ proposal, onClose }) {
  const { account } = useWallet()
  const { success, error: showError } = useToast()
  
  const [activeTab, setActiveTab] = useState('status')
  const [submitting, setSubmitting] = useState(false)
  
  // Form states
  const [statusUpdate, setStatusUpdate] = useState({
    status: proposal.state || '',
    message: ''
  })
  
  const [newsUpdate, setNewsUpdate] = useState({
    title: '',
    content: '',
    earlyAccessOnly: false
  })
  
  const [articleContent, setArticleContent] = useState('')

  // Load existing updates
  React.useEffect(() => {
    const proposalId = proposal.id?.toString() || String(proposal.id)
    
    // Load existing updates
    const proposalUpdates = JSON.parse(
      localStorage.getItem(`proposal_updates_${proposalId}`) || '{}'
    )
    
    // Load existing settings
    const proposalSettings = JSON.parse(
      localStorage.getItem(`proposal_settings_${proposalId}`) || '{}'
    )
    
    // Load existing article content
    if (proposalSettings.articleContent) {
      setArticleContent(proposalSettings.articleContent)
    } else if (proposalUpdates.articleContent) {
      setArticleContent(proposalUpdates.articleContent)
    }
    
    // Load existing status if any
    if (proposalUpdates.status) {
      setStatusUpdate({
        status: proposalUpdates.status.status || proposal.state || '',
        message: proposalUpdates.status.message || ''
      })
    }
  }, [proposal])

  const handleStatusUpdate = async (e) => {
    e.preventDefault()
    if (!statusUpdate.message.trim()) {
      showError('Please enter a status message')
      return
    }

    setSubmitting(true)
    try {
      const proposalId = proposal.id?.toString() || String(proposal.id)
      
      // Load existing updates
      const proposalUpdates = JSON.parse(
        localStorage.getItem(`proposal_updates_${proposalId}`) || '{}'
      )
      
      // Update status
      proposalUpdates.status = {
        status: statusUpdate.status,
        message: statusUpdate.message.trim(),
        timestamp: Date.now(),
        updatedBy: account
      }
      
      // Save to localStorage
      localStorage.setItem(`proposal_updates_${proposalId}`, JSON.stringify(proposalUpdates))
      
      success('Status update saved successfully!')
      
      // Reset form
      setStatusUpdate({
        status: proposal.state || '',
        message: ''
      })
      
      // Refresh parent
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (error) {
      console.error('Error updating status:', error)
      showError('Failed to save status update')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNewsUpdate = async (e) => {
    e.preventDefault()
    if (!newsUpdate.title.trim() || !newsUpdate.content.trim()) {
      showError('Please fill in both title and content')
      return
    }

    if (newsUpdate.content.trim().length < 50) {
      showError('Content must be at least 50 characters')
      return
    }

    setSubmitting(true)
    try {
      const proposalId = proposal.id?.toString() || String(proposal.id)
      
      // Load existing updates
      const proposalUpdates = JSON.parse(
        localStorage.getItem(`proposal_updates_${proposalId}`) || '{}'
      )
      
      // Initialize news array if not exists
      if (!proposalUpdates.news) {
        proposalUpdates.news = []
      }
      
      // Add new news update
      proposalUpdates.news.push({
        title: newsUpdate.title.trim(),
        content: newsUpdate.content.trim(),
        earlyAccessOnly: newsUpdate.earlyAccessOnly,
        timestamp: Date.now(),
        proposer: account
      })
      
      // Save to localStorage
      localStorage.setItem(`proposal_updates_${proposalId}`, JSON.stringify(proposalUpdates))
      
      success('News update shared successfully!')
      
      // Reset form
      setNewsUpdate({
        title: '',
        content: '',
        earlyAccessOnly: false
      })
      
      // Refresh parent
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (error) {
      console.error('Error sharing news update:', error)
      showError('Failed to share news update')
    } finally {
      setSubmitting(false)
    }
  }

  const handleArticleContentUpdate = async (e) => {
    e.preventDefault()
    if (!articleContent.trim()) {
      showError('Please enter article content')
      return
    }

    if (articleContent.trim().length < 100) {
      showError('Article content must be at least 100 characters')
      return
    }

    setSubmitting(true)
    try {
      const proposalId = proposal.id?.toString() || String(proposal.id)
      
      // Update proposal settings
      const proposalSettings = JSON.parse(
        localStorage.getItem(`proposal_settings_${proposalId}`) || '{}'
      )
      proposalSettings.articleContent = articleContent.trim()
      proposalSettings.timestamp = Date.now()
      
      // Also update in proposal updates for backward compatibility
      const proposalUpdates = JSON.parse(
        localStorage.getItem(`proposal_updates_${proposalId}`) || '{}'
      )
      proposalUpdates.articleContent = articleContent.trim()
      
      // Save to localStorage
      localStorage.setItem(`proposal_settings_${proposalId}`, JSON.stringify(proposalSettings))
      localStorage.setItem(`proposal_updates_${proposalId}`, JSON.stringify(proposalUpdates))
      
      success('Article content updated successfully!')
      
      // Refresh parent
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (error) {
      console.error('Error updating article content:', error)
      showError('Failed to update article content')
    } finally {
      setSubmitting(false)
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

  const parsed = parseProposalDescription(proposal.description)
  const proposalId = proposal.id?.toString() || String(proposal.id)
  
  // Load existing updates for display
  const proposalUpdates = JSON.parse(
    localStorage.getItem(`proposal_updates_${proposalId}`) || '{}'
  )
  const existingNews = proposalUpdates.news || []
  const existingStatus = proposalUpdates.status

  return (
    <AnimatePresence>
      <motion.div
        className="manage-proposal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="manage-proposal-modal"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header">
            <h2 className="modal-title">Manage Proposal #{proposal.id}</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>

          {/* Proposal Info */}
          <div className="proposal-info-card">
            <h3 className="proposal-title">{parsed.title || `Proposal #${proposal.id}`}</h3>
            <div className="proposal-meta">
              <span className="meta-badge status-badge">{proposal.state}</span>
              {parsed.category && <span className="meta-badge category-badge">{parsed.category}</span>}
            </div>
          </div>

          {/* Tabs */}
          <div className="modal-tabs">
            <button
              className={`tab-button ${activeTab === 'status' ? 'active' : ''}`}
              onClick={() => setActiveTab('status')}
            >
              📊 Status Update
            </button>
            <button
              className={`tab-button ${activeTab === 'news' ? 'active' : ''}`}
              onClick={() => setActiveTab('news')}
            >
              📢 News Update
            </button>
            <button
              className={`tab-button ${activeTab === 'article' ? 'active' : ''}`}
              onClick={() => setActiveTab('article')}
            >
              📝 Article Content
            </button>
          </div>

          {/* Status Update Tab */}
          {activeTab === 'status' && (
            <div className="tab-content">
              <div className="form-section">
                <h3 className="section-title">Update Proposal Status</h3>
                <p className="section-description">
                  Share status updates with voters and donors about the progress of your investigation.
                </p>
                
                {existingStatus && (
                  <div className="existing-update">
                    <div className="update-header">
                      <span className="update-label">Last Status:</span>
                      <span className="update-date">
                        {new Date(existingStatus.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="update-status-badge">{existingStatus.status}</div>
                    <p className="update-message">{existingStatus.message}</p>
                  </div>
                )}

                <form onSubmit={handleStatusUpdate} className="update-form">
                  <div className="form-group">
                    <label htmlFor="status">Current Status</label>
                    <select
                      id="status"
                      value={statusUpdate.status}
                      onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                      required
                    >
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="statusMessage">Status Message</label>
                    <textarea
                      id="statusMessage"
                      rows="5"
                      value={statusUpdate.message}
                      onChange={(e) => setStatusUpdate({ ...statusUpdate, message: e.target.value })}
                      placeholder="Describe the current status and progress of your investigation..."
                      required
                    />
                  </div>

                  <motion.button
                    type="submit"
                    className="submit-button"
                    disabled={submitting}
                    whileHover={!submitting ? { scale: 1.02 } : {}}
                    whileTap={!submitting ? { scale: 0.98 } : {}}
                  >
                    {submitting ? 'Saving...' : 'Save Status Update'}
                  </motion.button>
                </form>
              </div>
            </div>
          )}

          {/* News Update Tab */}
          {activeTab === 'news' && (
            <div className="tab-content">
              <div className="form-section">
                <h3 className="section-title">Share News Update</h3>
                <p className="section-description">
                  Share updates, findings, or breaking news with voters and donors.
                </p>

                {existingNews.length > 0 && (
                  <div className="existing-updates">
                    <h4 className="updates-title">Previous Updates ({existingNews.length})</h4>
                    {existingNews.slice().reverse().map((update, index) => (
                      <div key={index} className="existing-update">
                        <div className="update-header">
                          <span className="update-label">{update.title}</span>
                          <span className="update-date">
                            {new Date(update.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        {update.earlyAccessOnly && (
                          <span className="early-access-badge">Early Access Only</span>
                        )}
                        <p className="update-content">{update.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleNewsUpdate} className="update-form">
                  <div className="form-group">
                    <label htmlFor="newsTitle">Update Title</label>
                    <input
                      type="text"
                      id="newsTitle"
                      value={newsUpdate.title}
                      onChange={(e) => setNewsUpdate({ ...newsUpdate, title: e.target.value })}
                      placeholder="e.g., Breaking: Key Witness Interviewed"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="newsContent">Update Content</label>
                    <textarea
                      id="newsContent"
                      rows="8"
                      value={newsUpdate.content}
                      onChange={(e) => setNewsUpdate({ ...newsUpdate, content: e.target.value })}
                      placeholder="Share your findings, updates, or breaking news here. This will be visible to voters and donors..."
                      required
                      minLength={50}
                    />
                    <div className="char-count">
                      {newsUpdate.content.length} / 50 minimum characters
                    </div>
                  </div>

                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={newsUpdate.earlyAccessOnly}
                        onChange={(e) => setNewsUpdate({ ...newsUpdate, earlyAccessOnly: e.target.checked })}
                      />
                      <span>Early Access Only (visible only to voters who voted FOR and donors)</span>
                    </label>
                  </div>

                  <motion.button
                    type="submit"
                    className="submit-button"
                    disabled={submitting}
                    whileHover={!submitting ? { scale: 1.02 } : {}}
                    whileTap={!submitting ? { scale: 0.98 } : {}}
                  >
                    {submitting ? 'Sharing...' : 'Share News Update'}
                  </motion.button>
                </form>
              </div>
            </div>
          )}

          {/* Article Content Tab */}
          {activeTab === 'article' && (
            <div className="tab-content">
              <div className="form-section">
                <h3 className="section-title">Update Article Content</h3>
                <p className="section-description">
                  Update or create the full article content that will appear on the "Read" page.
                </p>

                {articleContent && (
                  <div className="existing-update">
                    <div className="update-header">
                      <span className="update-label">Current Article Content</span>
                      <span className="char-count-large">
                        {articleContent.length} characters
                      </span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleArticleContentUpdate} className="update-form">
                  <div className="form-group">
                    <label htmlFor="articleContent">Article Content</label>
                    <textarea
                      id="articleContent"
                      rows="15"
                      value={articleContent}
                      onChange={(e) => setArticleContent(e.target.value)}
                      placeholder="Write the full article content here. This will be displayed on the Read page..."
                      required
                      minLength={100}
                    />
                    <div className="char-count">
                      {articleContent.length} / 100 minimum characters
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    className="submit-button"
                    disabled={submitting}
                    whileHover={!submitting ? { scale: 1.02 } : {}}
                    whileTap={!submitting ? { scale: 0.98 } : {}}
                  >
                    {submitting ? 'Saving...' : 'Save Article Content'}
                  </motion.button>
                </form>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ManageProposal

