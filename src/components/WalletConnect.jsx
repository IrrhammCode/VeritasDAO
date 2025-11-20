import React, { useEffect, useState } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { useContracts } from '../hooks/useContracts'
import './WalletConnect.css'

function WalletConnect() {
  const { account, isConnecting, error, isMetaMaskInstalled, connect, disconnect } = useWallet()
  const { getTokenBalance, getVotingPower } = useContracts()
  const [tokenBalance, setTokenBalance] = useState('0')
  const [votingPower, setVotingPower] = useState('0')
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)

  useEffect(() => {
    if (account) {
      setIsLoadingBalance(true)
      Promise.all([
        getTokenBalance(account).catch(() => '0'),
        getVotingPower(account).catch(() => '0')
      ]).then(([balance, power]) => {
        const balanceValue = parseFloat(balance || '0')
        const powerValue = parseFloat(power || '0')
        setTokenBalance(isNaN(balanceValue) ? '0.00' : balanceValue.toFixed(2))
        setVotingPower(isNaN(powerValue) ? '0.00' : powerValue.toFixed(2))
        setIsLoadingBalance(false)
      }).catch((error) => {
        // Silently handle errors (contracts might not be deployed)
        console.error('Error loading balance:', error)
        setTokenBalance('0.00')
        setVotingPower('0.00')
        setIsLoadingBalance(false)
      })
    } else {
      setTokenBalance('0.00')
      setVotingPower('0.00')
      setIsLoadingBalance(false)
    }
  }, [account, getTokenBalance, getVotingPower])

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (!isMetaMaskInstalled) {
    return (
      <div className="wallet-connect">
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          className="wallet-button install"
        >
          Install MetaMask
        </a>
      </div>
    )
  }

  if (account) {
    return (
      <div className="wallet-connect">
        <div className="wallet-info">
          {isLoadingBalance ? (
            <div className="wallet-balance-loading">Loading...</div>
          ) : (
            <div className="wallet-balance">
              <span className="balance-label">VERITAS:</span>
              <span className="balance-value">{parseFloat(tokenBalance).toFixed(2)}</span>
              {parseFloat(votingPower) > 0 ? (
                <span className="voting-power">({parseFloat(votingPower).toFixed(2)} votes)</span>
              ) : parseFloat(tokenBalance) > 0 ? (
                <span className="voting-power-hint">(not delegated)</span>
              ) : null}
            </div>
          )}
          <span className="wallet-address">{formatAddress(account)}</span>
          <button
            className="wallet-button disconnect"
            onClick={disconnect}
          >
            Disconnect
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="wallet-connect">
      <button
        className="wallet-button connect"
        onClick={connect}
        disabled={isConnecting}
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {error && <div className="wallet-error">{error}</div>}
    </div>
  )
}

export default WalletConnect

