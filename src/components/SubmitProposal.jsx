import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useWallet } from '../contexts/WalletContext'
import { useContracts } from '../hooks/useContracts'
import { useToast } from '../contexts/ToastContext'
import { getContractAddresses } from '../config/contracts'
import { ethers } from 'ethers'
import Loading from './Loading'
import './SubmitProposal.css'

function SubmitProposal() {
  const { account } = useWallet()
  const { createProposal, getProposalThreshold, getTokenBalance, contracts, isLoading: contractsLoading } = useContracts()
  const { success, error: showError, info } = useToast()
  
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    requestedAmount: '',
    estimatedDuration: '',
    category: '',
    recipientAddress: '',
    readVisibility: 'none', // 'public', 'early-access', 'none'
    articleContent: '' // Content for Read page (required if readVisibility is not 'none')
  })

  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [proposalThreshold, setProposalThreshold] = useState('0')
  const [tokenBalance, setTokenBalance] = useState('0')
  const [hasEnoughTokens, setHasEnoughTokens] = useState(false)

  // Load proposal threshold and check token balance
  React.useEffect(() => {
    if (contracts.governor) {
      getProposalThreshold().then(setProposalThreshold)
    }
    
    // Check token balance if account is connected
    if (account && contracts.token) {
      getTokenBalance(account).then(balance => {
        setTokenBalance(balance)
        const threshold = parseFloat(proposalThreshold || '0')
        const balanceNum = parseFloat(balance || '0')
        setHasEnoughTokens(balanceNum >= threshold)
      }).catch(() => {
        setTokenBalance('0')
        setHasEnoughTokens(false)
      })
    } else {
      setTokenBalance('0')
      setHasEnoughTokens(false)
    }
  }, [contracts.governor, contracts.token, account, getProposalThreshold, getTokenBalance, proposalThreshold])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!account) {
      showError('Please connect your wallet first')
      return
    }

    if (!contracts.governor || !contracts.treasury) {
      showError('Contracts not loaded. Please check your network connection.')
      return
    }

    setIsSubmitting(true)
    info('Preparing proposal...')

    try {
      // Check token balance before submitting
      if (contracts.token && account) {
        const balance = await getTokenBalance(account)
        const threshold = parseFloat(proposalThreshold || '0')
        const balanceNum = parseFloat(balance || '0')
        
        if (balanceNum < threshold) {
          throw new Error(`Insufficient VERITAS tokens. You need at least ${threshold} VERITAS to create a proposal. Current balance: ${balanceNum.toFixed(2)} VERITAS`)
        }
      }

      // Validate recipient address
      if (!ethers.isAddress(formData.recipientAddress)) {
        throw new Error('Invalid recipient address')
      }

      // Validate amount
      const amount = ethers.parseEther(formData.requestedAmount)
      if (amount <= 0n) {
        throw new Error('Amount must be greater than 0')
      }

      // Validate article content if publishing to Read page
      if (formData.readVisibility !== 'none' && !formData.articleContent.trim()) {
        throw new Error('Please provide article content for Read page. This should describe your investigation findings or current status.')
      }

      if (formData.readVisibility !== 'none' && formData.articleContent.trim().length < 100) {
        throw new Error('Article content must be at least 100 characters. Please provide a detailed description of your investigation.')
      }

      // Prepare proposal description
      const description = `Funding Request: ${formData.title}\n\n` +
        `Author: ${formData.author}\n` +
        `Category: ${formData.category}\n` +
        `Recipient Wallet Address: ${formData.recipientAddress}\n` +
        `Requested Amount: ${formData.requestedAmount} ETH\n` +
        `Estimated Duration: ${formData.estimatedDuration}\n` +
        `Read Visibility: ${formData.readVisibility}\n\n` +
        `Description:\n${formData.description}`

      // Prepare calldata for Treasury.withdrawEth()
      const treasuryInterface = new ethers.Interface([
        "function withdrawEth(address payable to, uint256 amount) external"
      ])
      const calldata = treasuryInterface.encodeFunctionData("withdrawEth", [
        formData.recipientAddress,
        amount
      ])

      const addresses = getContractAddresses()
      const targets = [addresses.Treasury]
      const values = [0] // No ETH sent with the call
      const calldatas = [calldata]

      info('Submitting proposal to blockchain...')
      const result = await createProposal(targets, values, calldatas, description)

      if (result.proposalId) {
        // Save read visibility preference and article content to localStorage
        const proposalId = result.proposalId.toString()
        const proposalSettings = JSON.parse(
          localStorage.getItem(`proposal_settings_${proposalId}`) || '{}'
        )
        proposalSettings.readVisibility = formData.readVisibility
        proposalSettings.timestamp = Date.now()
        
        // If publishing to Read page, save article content
        if (formData.readVisibility !== 'none' && formData.articleContent.trim()) {
          // Save articleContent in settings for easy access
          proposalSettings.articleContent = formData.articleContent.trim()
          
          // Create initial news update with article content
          const proposalUpdates = JSON.parse(
            localStorage.getItem(`proposal_updates_${proposalId}`) || '{}'
          )
          if (!proposalUpdates.news) {
            proposalUpdates.news = []
          }
          
          // Add initial article
          proposalUpdates.news.push({
            title: formData.title,
            content: formData.articleContent.trim(),
            earlyAccessOnly: formData.readVisibility === 'early-access',
            timestamp: Date.now(),
            proposer: account
          })
          
          // Also save articleContent directly in updates for backward compatibility
          proposalUpdates.articleContent = formData.articleContent.trim()
          
          localStorage.setItem(`proposal_updates_${proposalId}`, JSON.stringify(proposalUpdates))
        }
        
        localStorage.setItem(`proposal_settings_${proposalId}`, JSON.stringify(proposalSettings))

        success(`Proposal created successfully! Proposal ID: ${result.proposalId}`)
        setSubmitted(true)
        setFormData({
          title: '',
          author: '',
          description: '',
          requestedAmount: '',
          estimatedDuration: '',
          category: '',
          recipientAddress: '',
          readVisibility: 'none',
          articleContent: ''
        })
        setTimeout(() => {
          setSubmitted(false)
        }, 5000)
      } else {
        success('Proposal transaction submitted! Check your wallet for confirmation.')
      }
    } catch (err) {
      console.error('Error submitting proposal:', err)
      const errorMessage = err.message || 'Failed to submit proposal. Please try again.'
      showError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="submit-section">
      <div className="section-container">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-title">Submit a Proposal</h2>
          <p className="section-description">
            Request funding for your investigative journalism project. All proposals 
            will be reviewed and voted on by DAO members.
          </p>
        </motion.div>

        <motion.div
          className="form-container"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {submitted ? (
            <motion.div
              className="success-message"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div className="success-icon">✓</div>
              <h3>Proposal Submitted!</h3>
              <p>Your proposal has been submitted to the DAO. It will be reviewed and put up for voting.</p>
            </motion.div>
          ) : (
            <form className="proposal-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title">Proposal Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Investigating Corporate Tax Evasion"
                />
              </div>

              <div className="form-group">
                <label htmlFor="author">Your Name / Pseudonym *</label>
                <input
                  type="text"
                  id="author"
                  name="author"
                  value={formData.author}
                  onChange={handleChange}
                  required
                  placeholder="Your name or journalist pseudonym"
                />
              </div>

              <div className="form-group">
                <label htmlFor="recipientAddress">Recipient Wallet Address *</label>
                <input
                  type="text"
                  id="recipientAddress"
                  name="recipientAddress"
                  value={formData.recipientAddress}
                  onChange={handleChange}
                  required
                  placeholder="0x..."
                  pattern="^0x[a-fA-F0-9]{40}$"
                />
                <small className="form-hint">Address where funding will be sent</small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select a category</option>
                    <option value="environment">Environment</option>
                    <option value="health">Health</option>
                    <option value="technology">Technology</option>
                    <option value="social-justice">Social Justice</option>
                    <option value="corruption">Corruption</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="requestedAmount">Requested Amount (ETH) *</label>
                  <input
                    type="number"
                    id="requestedAmount"
                    name="requestedAmount"
                    value={formData.requestedAmount}
                    onChange={handleChange}
                    required
                    placeholder="0.5"
                    min="0"
                    step="0.001"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="estimatedDuration">Estimated Duration *</label>
                <input
                  type="text"
                  id="estimatedDuration"
                  name="estimatedDuration"
                  value={formData.estimatedDuration}
                  onChange={handleChange}
                  required
                  placeholder="e.g., 3 months, 6 weeks"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Project Description *</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows="8"
                  placeholder="Provide a detailed description of your investigative project. Include: what you plan to investigate, why it matters, what sources you have access to, and what impact you expect this story to have."
                />
              </div>

              <div className="form-group">
                <label htmlFor="readVisibility">Publish to Read Page *</label>
                <div className="read-visibility-options">
                  <label className="visibility-option">
                    <input
                      type="radio"
                      name="readVisibility"
                      value="public"
                      checked={formData.readVisibility === 'public'}
                      onChange={handleChange}
                      required
                    />
                    <div className="option-content">
                      <span className="option-icon">🌍</span>
                      <div className="option-text">
                        <strong>Public</strong>
                        <small>Visible to everyone in Read page</small>
                      </div>
                    </div>
                  </label>
                  <label className="visibility-option">
                    <input
                      type="radio"
                      name="readVisibility"
                      value="early-access"
                      checked={formData.readVisibility === 'early-access'}
                      onChange={handleChange}
                      required
                    />
                    <div className="option-content">
                      <span className="option-icon">🔐</span>
                      <div className="option-text">
                        <strong>Early Access</strong>
                        <small>Only visible to voters & donors in Read page</small>
                      </div>
                    </div>
                  </label>
                  <label className="visibility-option">
                    <input
                      type="radio"
                      name="readVisibility"
                      value="none"
                      checked={formData.readVisibility === 'none'}
                      onChange={handleChange}
                      required
                    />
                    <div className="option-content">
                      <span className="option-icon">🚫</span>
                      <div className="option-text">
                        <strong>Don't Publish</strong>
                        <small>Not shown in Read page</small>
                      </div>
                    </div>
                  </label>
                </div>
                <small className="form-hint">
                  Choose how your investigation results will be displayed in the Read page
                </small>
              </div>

              {formData.readVisibility !== 'none' && (
                <div className="form-group">
                  <label htmlFor="articleContent">
                    Article Content for Read Page *
                    <span className="required-badge">Required</span>
                  </label>
                  <textarea
                    id="articleContent"
                    name="articleContent"
                    value={formData.articleContent}
                    onChange={handleChange}
                    required={formData.readVisibility !== 'none'}
                    rows="12"
                    minLength={100}
                    placeholder="Write your investigative journalism report here. Describe your findings, current investigation status, sources you've interviewed, evidence collected, and any preliminary conclusions. This content will be published in the Read page for the selected audience (public or early access). Be thorough and accurate - this represents your work as a journalist."
                    className="article-content-textarea"
                  />
                  <div className="article-content-hint">
                    <p>
                      <strong>📝 What to include:</strong>
                    </p>
                    <ul>
                      <li>Current status of your investigation</li>
                      <li>Key findings and evidence collected so far</li>
                      <li>Sources interviewed or contacted</li>
                      <li>Preliminary analysis or conclusions</li>
                      <li>Next steps or what you're working on</li>
                    </ul>
                    <p className="hint-warning">
                      <strong>⚠️ Important:</strong> This content will be visible to readers. Make sure it accurately reflects your current investigation status and findings.
                    </p>
                    <div className="character-count">
                      {formData.articleContent.length} / 100 minimum characters
                      {formData.articleContent.length < 100 && (
                        <span className="count-warning"> (Need {100 - formData.articleContent.length} more characters)</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="form-info">
                {proposalThreshold !== '0' && (
                  <div className="token-requirement">
                    <p>
                      <strong>Token Requirement:</strong> You need at least {proposalThreshold} VERITAS tokens to create a proposal.
                    </p>
                    {account && (
                      <p className={hasEnoughTokens ? 'token-status-ok' : 'token-status-warning'}>
                        Your balance: {parseFloat(tokenBalance || '0').toFixed(2)} VERITAS
                        {!hasEnoughTokens && (
                          <span> - <strong>Insufficient tokens!</strong> Get more tokens from the faucet.</span>
                        )}
                      </p>
                    )}
                  </div>
                )}
                <p>
                  <strong>Note:</strong> All proposals are submitted on-chain and are permanent. 
                  Once submitted, your proposal will be visible to all DAO members for voting.
                </p>
              </div>

              <motion.button
                type="submit"
                className="submit-button"
                disabled={isSubmitting || !account || contractsLoading || (!hasEnoughTokens && proposalThreshold !== '0')}
                whileHover={!isSubmitting && !contractsLoading ? { scale: 1.02, boxShadow: '0 0 30px var(--glow-blue)' } : {}}
                whileTap={!isSubmitting && !contractsLoading ? { scale: 0.98 } : {}}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Proposal to DAO'}
              </motion.button>
              
              {!account && (
                <p className="form-warning">Connect wallet to submit</p>
              )}
              
              {proposalThreshold !== '0' && (
                <p className="form-info-small">
                  Minimum {proposalThreshold} VERITAS tokens required to create a proposal
                </p>
              )}
            </form>
          )}
        </motion.div>
      </div>
    </section>
  )
}

export default SubmitProposal

