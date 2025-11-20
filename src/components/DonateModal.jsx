import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '../contexts/WalletContext'
import { useContracts } from '../hooks/useContracts'
import { useToast } from '../contexts/ToastContext'
import { isSupportedNetwork } from '../utils/contractHelpers'
import { ethers } from 'ethers'
import './DonateModal.css'

function DonateModal({ proposal, isOpen, onClose }) {
  const { account, chainId } = useWallet()
  const { signer, provider } = useContracts()
  const { success, error: showError, info } = useToast()
  
  const [donationAmount, setDonationAmount] = useState('')
  const [isDonating, setIsDonating] = useState(false)
  const [earlyAccessPromised, setEarlyAccessPromised] = useState(false)
  const [ethBalance, setEthBalance] = useState('0')
  const [recipientAddress, setRecipientAddress] = useState(null)

  // Parse proposal description to get recipient address
  useEffect(() => {
    if (!proposal) {
      setRecipientAddress(null)
      return
    }
    
    // Parse description to extract recipient address
    // Format from SubmitProposal: "Recipient Wallet Address: 0x..." or just look for any 0x address
    const description = proposal.description || ''
    const lines = description.split('\n')
    
    let recipient = null
    
    // Look for recipient address in description
    // Check for lines containing "Recipient" or look for any valid Ethereum address
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Check if line contains "Recipient" keyword
      if (trimmedLine.toLowerCase().includes('recipient')) {
        // Extract address from line
        const addressMatch = trimmedLine.match(/0x[a-fA-F0-9]{40}/)
        if (addressMatch && ethers.isAddress(addressMatch[0])) {
          recipient = addressMatch[0]
          break
        }
      }
    }
    
    // If not found, search for any valid Ethereum address in the description
    if (!recipient) {
      const addressMatch = description.match(/0x[a-fA-F0-9]{40}/g)
      if (addressMatch) {
        // Use the first valid address found (usually the recipient)
        for (const addr of addressMatch) {
          if (ethers.isAddress(addr)) {
            recipient = addr
            break
          }
        }
      }
    }
    
    // If still not found, use proposer as fallback
    if (!recipient && proposal.proposer && ethers.isAddress(proposal.proposer)) {
      recipient = proposal.proposer
    }
    
    setRecipientAddress(recipient)
  }, [proposal])

  // Get ETH balance
  useEffect(() => {
    if (account && provider) {
      provider.getBalance(account).then(balance => {
        setEthBalance(ethers.formatEther(balance))
      }).catch(() => {
        setEthBalance('0')
      })
    } else {
      setEthBalance('0')
    }
  }, [account, provider])

  const handleDonate = async () => {
    if (!account) {
      showError('Please connect your wallet')
      return
    }

    // Check network
    if (chainId && !isSupportedNetwork(chainId)) {
      showError('Please switch to Sepolia or Localhost network to donate')
      return
    }

    if (!signer) {
      showError('Signer not available. Please check your wallet connection.')
      return
    }

    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      showError('Please enter a valid donation amount')
      return
    }

    if (!recipientAddress) {
      showError('Recipient address not found in proposal')
      return
    }

    // Validate recipient address
    if (!ethers.isAddress(recipientAddress)) {
      showError('Invalid recipient address')
      return
    }

    // Check ETH balance
    const balance = parseFloat(ethBalance || '0')
    const amount = parseFloat(donationAmount)
    const estimatedGas = 0.001 // Estimated gas cost in ETH
    
    if (balance < amount + estimatedGas) {
      showError(`Insufficient ETH balance. You need at least ${(amount + estimatedGas).toFixed(4)} ETH (including gas). Current balance: ${balance.toFixed(4)} ETH`)
      return
    }

    setIsDonating(true)
    info('Processing donation...')

    try {
      const amountWei = ethers.parseEther(donationAmount)
      
      // Send ETH directly to recipient
      const tx = await signer.sendTransaction({
        to: recipientAddress,
        value: amountWei
      })

      info('Transaction submitted. Waiting for confirmation...')
      const receipt = await tx.wait()

      // Save donation record to localStorage for early access tracking
      const donationRecord = {
        proposalId: proposal.id,
        amount: donationAmount,
        recipient: recipientAddress,
        txHash: tx.hash,
        timestamp: Date.now(),
        earlyAccess: earlyAccessPromised,
        network: chainId === 11155111 ? 'sepolia' : 'localhost',
        donor: account // Track who donated
      }

      // Get existing donations
      const existingDonations = JSON.parse(localStorage.getItem('veritasDonations') || '[]')
      existingDonations.push(donationRecord)
      localStorage.setItem('veritasDonations', JSON.stringify(existingDonations))

      // Mark proposal as "donated" for this user - this will make it appear in Archive
      const donatedProposals = JSON.parse(localStorage.getItem('donatedProposals') || '[]')
      if (!donatedProposals.includes(proposal.id)) {
        donatedProposals.push(proposal.id)
        localStorage.setItem('donatedProposals', JSON.stringify(donatedProposals))
      }

      success(`Donation successful! Transaction: ${tx.hash.slice(0, 10)}...`)
      success('This proposal has been added to your Archive. You can now view all updates!')
      
      if (earlyAccessPromised) {
        success('You will receive early access to the article once it\'s published!')
      }

      // Reset form
      setDonationAmount('')
      setEarlyAccessPromised(false)
      onClose()
    } catch (error) {
      console.error('Error donating:', error)
      showError(error.message || 'Failed to process donation. Please try again.')
    } finally {
      setIsDonating(false)
    }
  }

  const presetAmounts = [0.01, 0.05, 0.1, 0.5, 1.0]

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="donate-modal-overlay" onClick={onClose}>
        <motion.div
          className="donate-modal"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="donate-modal-close" onClick={onClose}>×</button>
          
          <div className="donate-modal-header">
            <h2 className="donate-modal-title">Support This Investigation</h2>
            <p className="donate-modal-subtitle">
              Donate directly to the investigator and get early access to the article
            </p>
          </div>

          <div className="donate-modal-content">
            <div className="proposal-info">
              <h3 className="proposal-title-small">
                {proposal?.description?.split('\n')[0]?.replace('Funding Request:', '').trim() || `Proposal #${proposal?.id}`}
              </h3>
              <p className="proposal-author-small">
                Investigator: {proposal?.proposer ? `${proposal.proposer.slice(0, 6)}...${proposal.proposer.slice(-4)}` : 'Unknown'}
              </p>
              {recipientAddress && (
                <p className="recipient-address">
                  Recipient: {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}
                </p>
              )}
            </div>

            {/* Network and Balance Info */}
            <div className="donation-network-info">
              <div className="network-badge">
                {chainId === 11155111 ? '🌐 Sepolia Testnet' : chainId === 1337 ? '🌐 Localhost' : '⚠️ Wrong Network'}
              </div>
              {account && (
                <div className="balance-info">
                  Your Balance: <strong>{parseFloat(ethBalance || '0').toFixed(4)} ETH</strong>
                </div>
              )}
            </div>

            <div className="donation-amount-section">
              <label className="donation-label">Donation Amount (ETH Sepolia)</label>
              
              <div className="preset-amounts">
                {presetAmounts.map((amount) => (
                  <motion.button
                    key={amount}
                    className={`preset-amount-btn ${donationAmount === amount.toString() ? 'active' : ''}`}
                    onClick={() => setDonationAmount(amount.toString())}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {amount} ETH
                  </motion.button>
                ))}
              </div>

              <input
                type="number"
                className="donation-input"
                placeholder="Or enter custom amount"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                min="0"
                step="0.001"
              />
            </div>

            <div className="early-access-section">
              <label className="early-access-checkbox">
                <input
                  type="checkbox"
                  checked={earlyAccessPromised}
                  onChange={(e) => setEarlyAccessPromised(e.target.checked)}
                />
                <span className="checkbox-label">
                  <strong>Early Access Promise</strong>
                  <small>Investigator promises early access to article for supporters</small>
                </span>
              </label>
            </div>

            {donationAmount && parseFloat(donationAmount) > 0 && (
              <div className="donation-summary">
                <div className="summary-row">
                  <span>Donation Amount:</span>
                  <strong>{donationAmount} ETH</strong>
                </div>
                {earlyAccessPromised && (
                  <div className="summary-row highlight">
                    <span>Early Access:</span>
                    <strong>✓ Included</strong>
                  </div>
                )}
              </div>
            )}

            <motion.button
              className="donate-button"
              onClick={handleDonate}
              disabled={!donationAmount || parseFloat(donationAmount) <= 0 || isDonating || !account}
              whileHover={!isDonating && account ? { scale: 1.02 } : {}}
              whileTap={!isDonating && account ? { scale: 0.98 } : {}}
            >
              {isDonating ? 'Processing...' : !account ? 'Connect Wallet' : `Donate ${donationAmount || '0'} ETH`}
            </motion.button>

            <p className="donation-note">
              💡 Your donation goes directly to the investigator. Early access will be granted 
              once the article is published.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default DonateModal

