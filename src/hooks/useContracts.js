import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { getContractAddresses, getNetwork, CONTRACT_ABIS } from '../config/contracts'
import { useWallet } from '../contexts/WalletContext'

/**
 * Custom hook for interacting with VeritasDAO contracts
 */
export function useContracts() {
  const { account, chainId, isMetaMaskInstalled } = useWallet()
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [contracts, setContracts] = useState({})
  const [isLoading, setIsLoading] = useState(true)

  // Check if address is valid contract address
  const isValidAddress = (address) => {
    if (!address) return false
    return ethers.isAddress(address) && address !== ethers.ZeroAddress && address !== ''
  }

  // Initialize provider and signer
  useEffect(() => {
    if (!isMetaMaskInstalled) {
      setIsLoading(false)
      return
    }

    const initProvider = async () => {
      try {
        // Always use MetaMask provider for wallet operations (signer and contract calls)
        // MetaMask provider is more reliable for contract calls
        const provider = new ethers.BrowserProvider(window.ethereum)
        const signer = account ? await provider.getSigner() : null

        // For contract verification, use MetaMask provider directly (more reliable)
        // Custom RPC can have rate limits
        const verificationProvider = provider

        // Use MetaMask provider for contract instances (can do both read and write)
        setProvider(provider)
        setSigner(signer)

        // Initialize contracts - use chainId to determine network
        const addresses = getContractAddresses(chainId)
        const contractInstances = {}

        console.log('Initializing contracts with addresses:', {
          network: getNetwork(chainId),
          chainId,
          addresses
        })

        // Skip contract existence check - just create contract instances directly
        // MetaMask provider will handle errors if contract doesn't exist
        // This avoids rate limiting issues with custom RPC

        // Create contract instances directly - skip existence check to avoid rate limits
        // MetaMask provider will handle errors if contract doesn't exist
        if (isValidAddress(addresses.VeritasToken)) {
          try {
            contractInstances.token = new ethers.Contract(
              addresses.VeritasToken,
              CONTRACT_ABIS.VeritasToken,
              signer || provider
            )
            console.log('✓ VeritasToken contract instance created:', addresses.VeritasToken)
          } catch (error) {
            console.warn('VeritasToken contract not available:', error.message)
          }
        } else {
          console.warn('VeritasToken address is invalid or empty:', addresses.VeritasToken)
        }

        if (isValidAddress(addresses.VeritasGovernor)) {
          try {
            contractInstances.governor = new ethers.Contract(
              addresses.VeritasGovernor,
              CONTRACT_ABIS.VeritasGovernor,
              signer || provider
            )
            console.log('✓ VeritasGovernor contract instance created:', addresses.VeritasGovernor)
          } catch (error) {
            console.error('VeritasGovernor contract not available:', {
              address: addresses.VeritasGovernor,
              error: error.message,
              code: error.code,
              chainId: chainId
            })
          }
        } else {
          console.error('VeritasGovernor address is invalid or empty:', addresses.VeritasGovernor)
        }

        if (isValidAddress(addresses.Treasury)) {
          try {
            contractInstances.treasury = new ethers.Contract(
              addresses.Treasury,
              CONTRACT_ABIS.Treasury,
              signer || provider
            )
            console.log('✓ Treasury contract instance created:', addresses.Treasury)
          } catch (error) {
            console.warn('Treasury contract not available:', error.message)
          }
        }

        if (isValidAddress(addresses.VeritasFaucet)) {
          try {
            contractInstances.faucet = new ethers.Contract(
              addresses.VeritasFaucet,
              CONTRACT_ABIS.VeritasFaucet,
              signer || provider
            )
            console.log('✓ VeritasFaucet contract instance created:', addresses.VeritasFaucet)
          } catch (error) {
            console.warn('VeritasFaucet contract not available:', error.message)
          }
        }

        setContracts(contractInstances)
      } catch (error) {
        console.error('Error initializing contracts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initProvider()
  }, [account, chainId, isMetaMaskInstalled])

  // Check if contract address is valid
  const isValidContractAddress = useCallback((address) => {
    if (!address) return false
    return ethers.isAddress(address) && address !== ethers.ZeroAddress
  }, [])

  // Get token balance
  const getTokenBalance = useCallback(async (address) => {
    if (!address) return '0'
    if (!contracts.token) {
      console.warn('Token contract not available')
      return '0'
    }
    
    // Get contract address
    const contractAddress = contracts.token.target || contracts.token.address
    if (!isValidContractAddress(contractAddress)) {
      console.warn('Invalid token contract address:', contractAddress)
      return '0'
    }
    
    try {
      const balance = await contracts.token.balanceOf(address)
      const formatted = ethers.formatEther(balance || 0n)
      console.log(`Token balance for ${address}:`, formatted)
      return formatted
    } catch (error) {
      // Silently fail if contract doesn't exist or not deployed
      console.warn('Error getting token balance:', error.message)
      return '0'
    }
  }, [contracts.token, isValidContractAddress])

  // Get voting power
  const getVotingPower = useCallback(async (address) => {
    if (!address) return '0'
    if (!contracts.token) {
      console.warn('Token contract not available for voting power')
      return '0'
    }
    
    // Get contract address
    const contractAddress = contracts.token.target || contracts.token.address
    if (!isValidContractAddress(contractAddress)) {
      console.warn('Invalid token contract address for voting power:', contractAddress)
      return '0'
    }
    
    try {
      const votes = await contracts.token.getVotes(address)
      const formatted = ethers.formatEther(votes || 0n)
      console.log(`Voting power for ${address}:`, formatted)
      return formatted
    } catch (error) {
      // Silently fail if contract doesn't exist or not deployed
      console.warn('Error getting voting power:', error.message)
      return '0'
    }
  }, [contracts.token, isValidContractAddress])

  // Request faucet tokens (for testnet/development)
  const requestFaucet = useCallback(async (address) => {
    if (!address) {
      throw new Error('Address is required')
    }
    
    // Use Faucet contract if available
    if (contracts.faucet && signer) {
      try {
        console.log('Using faucet contract:', contracts.faucet.target)
        
        // Skip all read calls - they're failing with MetaMask provider
        // Just try to call requestTokens() directly
        // The transaction will revert with a proper error message if there's an issue
        
        // Request tokens from faucet directly
        console.log('Calling requestTokens()...')
        const tx = await contracts.faucet.requestTokens()
        console.log('Transaction sent, hash:', tx.hash)
        console.log('Waiting for confirmation...')
        
        const receipt = await tx.wait()
        console.log('Transaction confirmed:', receipt)
        console.log('Block number:', receipt.blockNumber)
        console.log('Transaction status:', receipt.status)
        
        // Check if transaction reverted
        if (receipt.status === 0) {
          throw new Error('Transaction reverted. Check if faucet address is set in token contract.')
        }
        
        // Check for revert reason in logs
        if (receipt.logs && receipt.logs.length === 0) {
          console.warn('No events emitted - transaction may have reverted silently')
        }
        
        // Wait a bit for block to be finalized
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Verify balance after transaction
        if (contracts.token) {
          const balanceAfter = await contracts.token.balanceOf(address)
          const balanceFormatted = ethers.formatEther(balanceAfter)
          console.log('Balance after faucet:', balanceFormatted, 'VERITAS')
          
          // If balance is still 0, check if faucet address is set
          if (parseFloat(balanceFormatted) === 0) {
            try {
              const faucetAddressInToken = await contracts.token.faucetAddress()
              console.log('Faucet address in token contract:', faucetAddressInToken)
              console.log('Current faucet contract address:', contracts.faucet.target)
              
              if (faucetAddressInToken.toLowerCase() !== contracts.faucet.target.toLowerCase()) {
                throw new Error('Faucet address not set in token contract! Please contact the DAO administrator to set the faucet address.')
              }
              
              // If address is set but balance is 0, transaction might have reverted
              throw new Error('Transaction confirmed but balance is still 0. The mint may have failed. Please check the transaction on Etherscan.')
            } catch (checkError) {
              // If faucetAddress() doesn't exist, this is an old contract version
              if (checkError.message && checkError.message.includes('execution reverted')) {
                throw new Error('This token contract is an old version that does not support faucet. Please update VITE_VERITAS_TOKEN_ADDRESS in .env to the new contract address: 0x1a3a6d767F44Deab6339748cf3c87D0A07cfDc7A')
              }
              throw checkError
            }
          }
        }
        
        return { 
          success: true, 
          txHash: tx.hash, 
          message: `${amountFormatted} VERITAS tokens received successfully! Transaction: ${tx.hash.slice(0, 10)}...` 
        }
      } catch (error) {
        console.error('Faucet request error:', error)
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          data: error.data,
          reason: error.reason
        })
        
        if (error.message && error.message.includes('Cooldown')) {
          throw error
        }
        if (error.message && error.message.includes('paused')) {
          throw new Error('Faucet is currently paused. Please contact the DAO administrator.')
        }
        if (error.message && error.message.includes('only faucet can call')) {
          throw new Error('Faucet address not set in token contract. Please contact the DAO administrator.')
        }
        // If BAD_DATA error, contract might not be accessible via MetaMask provider
        if (error.code === 'BAD_DATA' || error.message?.includes('could not decode')) {
          const addresses = getContractAddresses(chainId)
          throw new Error(
            `Cannot access faucet contract at ${addresses.VeritasFaucet}. ` +
            `This might be a provider issue. Please try:\n` +
            `1. Refresh the page\n` +
            `2. Switch network and switch back\n` +
            `3. Check if you're connected to Sepolia network (Chain ID: 11155111)`
          )
        }
        throw new Error(error.message || 'Failed to request tokens from faucet')
      }
    }
    
    // Fallback: Try backend API if faucet contract not available
    const faucetApiUrl = import.meta.env.VITE_FAUCET_API_URL || 'http://localhost:3001/api/faucet'
    
    try {
      const response = await fetch(faucetApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      })
      
      if (response.ok) {
        const data = await response.json()
        return { success: true, txHash: data.txHash, message: data.message || 'Tokens minted successfully' }
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Faucet request failed')
      }
    } catch (apiError) {
        // Check if it's a network error or contract not available
        if (!contracts.faucet) {
          const addresses = getContractAddresses(chainId)
          // Use consistent network name - always show "Sepolia" for chainId 11155111
          const networkName = chainId === 11155111 ? 'Sepolia' : (getNetwork(chainId) || 'Unknown')
          throw new Error(
            `Faucet contract not available. Please check:\n` +
            `1. You are connected to ${networkName} testnet (Chain ID: ${chainId || 'unknown'})\n` +
            `2. Faucet contract is deployed at: ${addresses.VeritasFaucet || 'not set'}\n` +
            `3. Restart dev server after updating .env file`
          )
        }
      throw new Error('Faucet request failed. Please check your network connection and try again.')
    }
  }, [contracts.faucet, signer])

  // Delegate voting power
  const delegate = useCallback(async (delegatee) => {
    if (!contracts.token || !signer) {
      throw new Error('Wallet not connected')
    }
    try {
      const tx = await contracts.token.delegate(delegatee)
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error('Error delegating:', error)
      throw error
    }
  }, [contracts.token, signer])

  // Create proposal
  const createProposal = useCallback(async (targets, values, calldatas, description) => {
    if (!contracts.governor || !signer) {
      throw new Error('Wallet not connected')
    }
    try {
      const tx = await contracts.governor.propose(targets, values, calldatas, description)
      const receipt = await tx.wait()
      
      // Extract proposal ID from events
      const proposalCreatedEvent = receipt.logs.find(
        log => {
          try {
            const parsed = contracts.governor.interface.parseLog(log)
            return parsed && parsed.name === 'ProposalCreated'
          } catch {
            return false
          }
        }
      )
      
      if (proposalCreatedEvent) {
        const parsed = contracts.governor.interface.parseLog(proposalCreatedEvent)
        return {
          txHash: tx.hash,
          proposalId: parsed.args.proposalId.toString(),
        }
      }
      
      return { txHash: tx.hash }
    } catch (error) {
      console.error('Error creating proposal:', error)
      throw error
    }
  }, [contracts.governor, signer])

  // Vote on proposal
  const vote = useCallback(async (proposalId, support) => {
    if (!contracts.governor || !signer) {
      throw new Error('Wallet not connected')
    }
    try {
      console.log(`Calling castVote with proposalId: ${proposalId}, support: ${support}`)
      const tx = await contracts.governor.castVote(proposalId, support)
      console.log('Vote transaction sent:', tx.hash)
      // Wait for at least 1 confirmation
      const receipt = await tx.wait(1)
      console.log('Vote transaction confirmed:', receipt.blockNumber)
      return tx.hash
    } catch (error) {
      console.error('Error voting:', error)
      throw error
    }
  }, [contracts.governor, signer])

  // Get proposal state
  const getProposalState = useCallback(async (proposalId) => {
    if (!contracts.governor) return null
    try {
      const state = await contracts.governor.state(proposalId)
      const states = [
        'Pending', 'Active', 'Canceled', 'Defeated',
        'Succeeded', 'Queued', 'Expired', 'Executed'
      ]
      return states[state]
    } catch (error) {
      console.error('Error getting proposal state:', error)
      return null
    }
  }, [contracts.governor])

  // Get proposal votes
  const getProposalVotes = useCallback(async (proposalId) => {
    if (!contracts.governor) return null
    try {
      const votes = await contracts.governor.proposalVotes(proposalId)
      return {
        against: ethers.formatEther(votes.againstVotes),
        for: ethers.formatEther(votes.forVotes),
        abstain: ethers.formatEther(votes.abstainVotes),
      }
    } catch (error) {
      console.error('Error getting proposal votes:', error)
      return null
    }
  }, [contracts.governor])

  // Get proposal threshold
  const getProposalThreshold = useCallback(async () => {
    if (!contracts.governor) return '0'
    try {
      const threshold = await contracts.governor.proposalThreshold()
      return ethers.formatEther(threshold)
    } catch (error) {
      console.error('Error getting proposal threshold:', error)
      return '0'
    }
  }, [contracts.governor])

  // Get all proposals (by querying ProposalCreated events)
  const getAllProposals = useCallback(async () => {
    if (!contracts.governor || !provider) return []
    try {
      // Query ProposalCreated events
      const filter = contracts.governor.filters.ProposalCreated()
      const events = await contracts.governor.queryFilter(filter)
      
      // Get details for each proposal
      const proposals = await Promise.all(
        events.map(async (event) => {
          const proposalId = event.args.proposalId.toString()
          try {
            const [state, votes, snapshot, deadline, hasVoted] = await Promise.all([
              contracts.governor.state(proposalId),
              contracts.governor.proposalVotes(proposalId),
              contracts.governor.proposalSnapshot(proposalId),
              contracts.governor.proposalDeadline(proposalId),
              account ? contracts.governor.hasVoted(proposalId, account).catch(() => false) : false
            ])

            const states = [
              'Pending', 'Active', 'Canceled', 'Defeated',
              'Succeeded', 'Queued', 'Expired', 'Executed'
            ]

            // Parse description from event (if available)
            const description = event.args.description || ''

            // Convert deadline block number to timestamp
            let deadlineTimestamp = null
            try {
              const deadlineBlock = await provider.getBlock(deadline.toString())
              deadlineTimestamp = deadlineBlock.timestamp * 1000
            } catch (error) {
              // Fallback: estimate from current block
              try {
                const currentBlock = await provider.getBlockNumber()
                const currentBlockData = await provider.getBlock('latest')
                const blockDiff = Number(deadline) - currentBlock
                const avgBlockTime = 12 // seconds
                deadlineTimestamp = (currentBlockData.timestamp + (blockDiff * avgBlockTime)) * 1000
              } catch {
                deadlineTimestamp = Date.now()
              }
            }

            return {
              id: proposalId,
              proposalId: proposalId,
              proposer: event.args.proposer,
              description: description,
              state: states[state],
              stateNumber: state,
              votesFor: ethers.formatEther(votes.forVotes),
              votesAgainst: ethers.formatEther(votes.againstVotes),
              votesAbstain: ethers.formatEther(votes.abstainVotes),
              snapshot: snapshot.toString(),
              deadline: deadline.toString(),
              deadlineTimestamp: deadlineTimestamp,
              hasVoted: hasVoted,
              createdAt: event.blockNumber,
            }
          } catch (error) {
            console.error(`Error getting proposal ${proposalId} details:`, error)
            return null
          }
        })
      )

      // Filter out null results and sort by ID (newest first)
      return proposals
        .filter(p => p !== null)
        .sort((a, b) => parseInt(b.id) - parseInt(a.id))
    } catch (error) {
      console.error('Error getting all proposals:', error)
      return []
    }
  }, [contracts.governor, provider, account])

  // Get proposal details
  const getProposalDetails = useCallback(async (proposalId) => {
    if (!contracts.governor) return null
    try {
      const [state, votes, snapshot, deadline, hasVoted] = await Promise.all([
        contracts.governor.state(proposalId),
        contracts.governor.proposalVotes(proposalId),
        contracts.governor.proposalSnapshot(proposalId),
        contracts.governor.proposalDeadline(proposalId),
        account ? contracts.governor.hasVoted(proposalId, account).catch(() => false) : false
      ])

      const states = [
        'Pending', 'Active', 'Canceled', 'Defeated',
        'Succeeded', 'Queued', 'Expired', 'Executed'
      ]

      return {
        id: proposalId,
        state: states[state],
        stateNumber: state,
        votesFor: ethers.formatEther(votes.forVotes),
        votesAgainst: ethers.formatEther(votes.againstVotes),
        votesAbstain: ethers.formatEther(votes.abstainVotes),
        snapshot: snapshot.toString(),
        deadline: deadline.toString(),
        hasVoted: hasVoted,
      }
    } catch (error) {
      console.error('Error getting proposal details:', error)
      return null
    }
  }, [contracts.governor, account])

  // Get treasury balances
  const getTreasuryBalances = useCallback(async () => {
    if (!contracts.treasury || !contracts.token) {
      console.warn('Treasury or token contract not available')
      return null
    }
    
    // Check if contract addresses are valid
    if (!isValidContractAddress(contracts.treasury.target) || !isValidContractAddress(contracts.token.target)) {
      console.warn('Invalid contract addresses')
      return null
    }

    try {
      const [ethBalance, veritasBalance] = await Promise.all([
        contracts.treasury.getEthBalance().catch((err) => {
          console.error('Error getting ETH balance:', err)
          return 0n
        }),
        contracts.treasury.getTokenBalance(contracts.token.target).catch((err) => {
          console.error('Error getting VERITAS balance:', err)
          return 0n
        })
      ])

      return {
        eth: ethers.formatEther(ethBalance || 0n),
        veritas: ethers.formatEther(veritasBalance || 0n),
        // USDC would need a separate contract address
        usdc: '0' // Placeholder
      }
    } catch (error) {
      console.error('Error getting treasury balances:', error)
      // Return default values instead of null
      return {
        eth: '0',
        veritas: '0',
        usdc: '0'
      }
    }
  }, [contracts.treasury, contracts.token, isValidContractAddress])

  // Get user activity (proposals created, votes cast)
  const getUserActivity = useCallback(async () => {
    if (!contracts.governor || !account || !provider) return { proposalsCreated: 0, votesCast: 0 }
    try {
      // Query all ProposalCreated events and filter by proposer
      const proposalsFilter = contracts.governor.filters.ProposalCreated()
      const allProposalsEvents = await contracts.governor.queryFilter(proposalsFilter)
      // Filter by proposer address (proposer is the first indexed parameter)
      const proposalsEvents = allProposalsEvents.filter(event => 
        event.args && event.args.proposer && 
        event.args.proposer.toLowerCase() === account.toLowerCase()
      )

      // Query VoteCast events by voter (voter is indexed)
      const votesFilter = contracts.governor.filters.VoteCast(account)
      const votesEvents = await contracts.governor.queryFilter(votesFilter)

      return {
        proposalsCreated: proposalsEvents.length,
        votesCast: votesEvents.length
      }
    } catch (error) {
      console.error('Error getting user activity:', error)
      return { proposalsCreated: 0, votesCast: 0 }
    }
  }, [contracts.governor, account, provider])

  return {
    provider,
    signer,
    contracts,
    isLoading,
    getTokenBalance,
    requestFaucet,
    getVotingPower,
    delegate,
    createProposal,
    vote,
    getProposalState,
    getProposalVotes,
    getProposalThreshold,
    getAllProposals,
    getProposalDetails,
    getTreasuryBalances,
    getUserActivity,
  }
}

