import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useWallet } from '../contexts/WalletContext'
import { useToast } from '../contexts/ToastContext'
import { useContracts } from '../hooks/useContracts'
import './JournalistVerification.css'

function JournalistVerification() {
  const { account } = useWallet()
  const { success, error: showError } = useToast()
  const { verifyJournalist, isJournalistVerified, getVerificationTimestamp, contracts, isLoading } = useContracts()
  const [isVerified, setIsVerified] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationTimestamp, setVerificationTimestamp] = useState(null)
  const [isChecking, setIsChecking] = useState(true)

  // Check verification status on mount and when account changes
  useEffect(() => {
    const checkVerification = async () => {
      if (!account || isLoading || !contracts.journalistRegistry) {
        setIsVerified(false)
        setVerificationTimestamp(null)
        setIsChecking(false)
        return
      }

      try {
        setIsChecking(true)
        const verified = await isJournalistVerified(account)
        setIsVerified(verified)
        
        if (verified) {
          const timestamp = await getVerificationTimestamp(account)
          setVerificationTimestamp(timestamp)
        } else {
          setVerificationTimestamp(null)
        }
      } catch (error) {
        console.error('Error checking verification:', error)
        setIsVerified(false)
        setVerificationTimestamp(null)
      } finally {
        setIsChecking(false)
      }
    }

    checkVerification()
  }, [account, contracts.journalistRegistry, isLoading, isJournalistVerified, getVerificationTimestamp])

  const handleVerify = async () => {
    if (!account) {
      showError('Please connect your wallet first')
      return
    }

    if (!contracts.journalistRegistry) {
      showError('JournalistRegistry contract not available. Please check your network connection.')
      return
    }

    setIsVerifying(true)
    try {
      // Call smart contract to verify
      const result = await verifyJournalist()
      
      if (result.success) {
        // Update state
        setIsVerified(true)
        const timestamp = await getVerificationTimestamp(account)
        setVerificationTimestamp(timestamp)
        
        success(`Journalist verification successful! Transaction: ${result.txHash.slice(0, 10)}...`)
      }
    } catch (error) {
      console.error('Verification error:', error)
      if (error.message.includes('rejected')) {
        showError('Transaction cancelled. Please try again if you want to verify.')
      } else {
        showError(error.message || 'Failed to verify journalist status')
      }
    } finally {
      setIsVerifying(false)
    }
  }

  if (!account) {
    return null
  }

  return (
    <motion.div
      className="journalist-verification"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="verification-card">
        <div className="verification-header">
          <h3 className="verification-title">
            <span className="verification-icon">✍️</span>
            Journalist Verification
          </h3>
          {isVerified && (
            <span className="verified-badge">
              <span className="badge-icon">✓</span>
              Verified
            </span>
          )}
        </div>

        <div className="verification-content">
          {isVerified ? (
            <div className="verified-content">
              <p className="verified-message">
                You are a verified journalist on VeritasDAO. Your verification helps build trust with the community.
              </p>
              {verificationTimestamp && (
                <div className="verification-details">
                  <p className="detail-item">
                    <span className="detail-label">Verified:</span>
                    <span className="detail-value">
                      {new Date(verificationTimestamp).toLocaleDateString()}
                    </span>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="unverified-content">
              <p className="verification-description">
                Verify your identity as a journalist by signing a message with your wallet. 
                This helps build trust and credibility with the VeritasDAO community.
              </p>
              {!contracts.journalistRegistry ? (
                <p className="verification-warning">
                  JournalistRegistry contract not deployed. Please check your network connection.
                </p>
              ) : (
                <button
                  className="verify-button"
                  onClick={handleVerify}
                  disabled={isVerifying || isChecking}
                >
                  {isVerifying ? (
                    <>
                      <span className="spinner"></span>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      Verify as Journalist
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default JournalistVerification

