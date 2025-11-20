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
          } catch (error) {
          }
        } else {
        }

        if (isValidAddress(addresses.VeritasGovernor)) {
          try {
            contractInstances.governor = new ethers.Contract(
              addresses.VeritasGovernor,
              CONTRACT_ABIS.VeritasGovernor,
              signer || provider
            )
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
          } catch (error) {
          }
        }

        if (isValidAddress(addresses.VeritasFaucet)) {
          try {
            contractInstances.faucet = new ethers.Contract(
              addresses.VeritasFaucet,
              CONTRACT_ABIS.VeritasFaucet,
              signer || provider
            )
          } catch (error) {
          }
        }

        if (isValidAddress(addresses.JournalistRegistry)) {
          try {
            contractInstances.journalistRegistry = new ethers.Contract(
              addresses.JournalistRegistry,
              CONTRACT_ABIS.JournalistRegistry,
              signer || provider
            )
          } catch (error) {
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
      return '0'
    }
    
    // Get contract address
    const contractAddress = contracts.token.target || contracts.token.address
    if (!isValidContractAddress(contractAddress)) {
      return '0'
    }
    
    try {
      const balance = await contracts.token.balanceOf(address)
      const formatted = ethers.formatEther(balance || 0n)
      return formatted
    } catch (error) {
      // Silently fail if contract doesn't exist or not deployed
      return '0'
    }
  }, [contracts.token, isValidContractAddress])

  // Get voting power
  const getVotingPower = useCallback(async (address) => {
    if (!address) return '0'
    if (!contracts.token) {
      return '0'
    }
    
    // Get contract address
    const contractAddress = contracts.token.target || contracts.token.address
    if (!isValidContractAddress(contractAddress)) {
      return '0'
    }
    
    try {
      const votes = await contracts.token.getVotes(address)
      const formatted = ethers.formatEther(votes || 0n)
      return formatted
    } catch (error) {
      // Silently fail if contract doesn't exist or not deployed
      return '0'
    }
  }, [contracts.token, isValidContractAddress])
  
  // Get voting power at a specific block (for proposal snapshot)
  const getVotingPowerAtBlock = useCallback(async (address, blockNumber) => {
    if (!contracts.token) return '0'
    try {
      const votes = await contracts.token.getPastVotes(address, blockNumber)
      return ethers.formatEther(votes)
    } catch (error) {
      console.error(`Error getting voting power at block ${blockNumber}:`, error)
      return '0'
    }
  }, [contracts.token])

  // Request faucet tokens (for testnet/development)
  const requestFaucet = useCallback(async (address) => {
    if (!address) {
      throw new Error('Address is required')
    }
    
    // Use Faucet contract if available
    if (contracts.faucet && signer) {
      try {
        
        // Skip all read calls - they're failing with MetaMask provider
        // Just try to call requestTokens() directly
        // The transaction will revert with a proper error message if there's an issue
        
        // Request tokens from faucet directly
        const tx = await contracts.faucet.requestTokens()
        
        const receipt = await tx.wait()
        
        // Check if transaction reverted
        if (receipt.status === 0) {
          throw new Error('Transaction reverted. Check if faucet address is set in token contract.')
        }
        
        // Check for revert reason in logs
        if (receipt.logs && receipt.logs.length === 0) {
        }
        
        // Wait a bit for block to be finalized
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Verify balance after transaction
        if (contracts.token) {
          const balanceAfter = await contracts.token.balanceOf(address)
          const balanceFormatted = ethers.formatEther(balanceAfter)
          
          // If balance is still 0, check if faucet address is set
          if (parseFloat(balanceFormatted) === 0) {
            try {
              const faucetAddressInToken = await contracts.token.faucetAddress()
              
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
      const tx = await contracts.governor.castVote(proposalId, support)
      // Wait for at least 1 confirmation
      const receipt = await tx.wait(1)
      
      // Immediately check vote count after confirmation
      try {
        const votes = await contracts.governor.proposalVotes(proposalId)
      } catch (voteError) {
      }
      
      return tx.hash
    } catch (error) {
      console.error('[VOTE] Error voting:', error)
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
      const result = {
        against: ethers.formatEther(votes.againstVotes),
        for: ethers.formatEther(votes.forVotes),
        abstain: ethers.formatEther(votes.abstainVotes),
      }
      return result
    } catch (error) {
      console.error('Error getting proposal votes:', error)
      return null
    }
  }, [contracts.governor])
  
  // Get all votes for a proposal by querying VoteCast events
  const getProposalVotesFromEvents = useCallback(async (proposalId) => {
    if (!contracts.governor || !provider) return null
    try {
      // VoteCast event: VoteCast(address indexed voter, uint256 indexed proposalId, uint8 support, uint256 weight, string reason)
      // Filter by proposalId (second indexed parameter, first is null for voter)
      let events = []
      try {
        const filter = contracts.governor.filters.VoteCast(null, proposalId)
        events = await contracts.governor.queryFilter(filter)
      } catch (filterError) {
        // Fallback: query all VoteCast events and filter manually
        const allEvents = await contracts.governor.queryFilter(contracts.governor.filters.VoteCast())
        events = allEvents.filter(e => {
          try {
            const parsed = contracts.governor.interface.parseLog(e)
            return parsed && parsed.args.proposalId && parsed.args.proposalId.toString() === proposalId
          } catch {
            return false
          }
        })
      }
      
      
      let totalFor = BigInt(0)
      let totalAgainst = BigInt(0)
      let totalAbstain = BigInt(0)
      
      events.forEach((event, index) => {
        try {
          const parsed = contracts.governor.interface.parseLog(event)
          if (parsed && parsed.name === 'VoteCast') {
            const support = parsed.args.support
            const weight = parsed.args.weight
            
            if (support === 0) {
              totalAgainst += weight
            } else if (support === 1) {
              totalFor += weight
            } else if (support === 2) {
              totalAbstain += weight
            }
          }
        } catch (parseError) {
        }
      })
      
      const result = {
        against: ethers.formatEther(totalAgainst),
        for: ethers.formatEther(totalFor),
        abstain: ethers.formatEther(totalAbstain),
        eventCount: events.length
      }
      return result
    } catch (error) {
      console.error('[VOTES] Error getting votes from events:', error)
      return null
    }
  }, [contracts.governor, provider])

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
      // Force provider to use latest block
      await provider.getBlockNumber() // This ensures we're using latest block
      
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
            
            // Get vote counts from contract (may not be accurate immediately after vote)
            let contractVotesFor = parseFloat(ethers.formatEther(votes.forVotes))
            let contractVotesAgainst = parseFloat(ethers.formatEther(votes.againstVotes))
            let contractVotesAbstain = parseFloat(ethers.formatEther(votes.abstainVotes))
            
            
            // ALWAYS use events as primary source - more reliable and includes all votes
            let votesFor = contractVotesFor
            let votesAgainst = contractVotesAgainst
            let votesAbstain = contractVotesAbstain
            
            try {
              // Query all VoteCast events and filter by proposalId (most reliable method)
              const allVoteEvents = await contracts.governor.queryFilter(contracts.governor.filters.VoteCast())
              const filteredEvents = allVoteEvents.filter(e => {
                try {
                  const parsed = contracts.governor.interface.parseLog(e)
                  if (parsed && parsed.name === 'VoteCast') {
                    const eventProposalId = parsed.args.proposalId ? parsed.args.proposalId.toString() : null
                    return eventProposalId === proposalId
                  }
                  return false
                } catch {
                  return false
                }
              })
              
              if (filteredEvents.length > 0) {
                // Count votes: Each vote = 10 VERITAS (fixed cost)
                const VOTE_COST = 10
                let voteCountFor = 0
                let voteCountAgainst = 0
                let voteCountAbstain = 0
                
                filteredEvents.forEach((event, index) => {
                  try {
                    const parsed = contracts.governor.interface.parseLog(event)
                    if (parsed && parsed.name === 'VoteCast') {
                      // Get all args from event
                      const args = parsed.args
                      const support = Number(args.support)
                      const voter = args.voter
                      
                      // proposalId is the second indexed parameter in VoteCast event
                      // VoteCast(address indexed voter, uint256 indexed proposalId, uint8 support, uint256 weight, string reason)
                      let eventProposalId = null
                      if (args.proposalId !== undefined) {
                        eventProposalId = args.proposalId.toString()
                      } else if (args.length >= 2) {
                        // Fallback: try to get from args array
                        eventProposalId = args[1] ? args[1].toString() : null
                      }
                      
                      // Double check proposalId matches
                      if (eventProposalId && eventProposalId !== proposalId) {
                        return
                      }
                      
                      const supportLabel = support === 0 ? 'AGAINST' : support === 1 ? 'FOR' : support === 2 ? 'ABSTAIN' : 'UNKNOWN'
                      
                      // Count votes (each vote = 10 VERITAS)
                      if (support === 0) {
                        voteCountAgainst++
                      } else if (support === 1) {
                        voteCountFor++
                      } else if (support === 2) {
                        voteCountAbstain++
                      }
                    }
                  } catch (parseError) {
                    // Silent fail for parse errors
                  }
                })
                
                // Calculate VERITAS amounts: votes × 10 VERITAS per vote
                const eventVotesFor = voteCountFor * VOTE_COST
                const eventVotesAgainst = voteCountAgainst * VOTE_COST
                const eventVotesAbstain = voteCountAbstain * VOTE_COST
                
                
                // ALWAYS use events as primary source (more reliable, includes all votes)
                votesFor = eventVotesFor
                votesAgainst = eventVotesAgainst
                votesAbstain = eventVotesAbstain
                
              } else {
                // No events found, use contract values
              }
            } catch (eventError) {
              // Silent fail, use contract values
            }

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
              votesFor: votesFor.toString(), // Use updated vote count (from events if mismatch)
              votesAgainst: votesAgainst.toString(), // Use updated vote count (from events if mismatch)
              votesAbstain: votesAbstain.toString(), // Use updated vote count (from events if mismatch)
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
      return null
    }
    
    // Check if contract addresses are valid
    if (!isValidContractAddress(contracts.treasury.target) || !isValidContractAddress(contracts.token.target)) {
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

  // Verify journalist
  const verifyJournalist = useCallback(async () => {
    if (!contracts.journalistRegistry || !signer) {
      throw new Error('JournalistRegistry contract not available. Please check your network connection.')
    }

    try {
      const tx = await contracts.journalistRegistry.verifyJournalist()
      await tx.wait()
      return { success: true, txHash: tx.hash }
    } catch (error) {
      console.error('Error verifying journalist:', error)
      if (error.code === 4001) {
        throw new Error('User rejected the transaction')
      }
      throw new Error(error.message || 'Failed to verify journalist')
    }
  }, [contracts.journalistRegistry, signer])

  // Check if address is verified journalist
  const isJournalistVerified = useCallback(async (address) => {
    if (!address || !contracts.journalistRegistry) {
      return false
    }

    try {
      const verified = await contracts.journalistRegistry.isVerified(address)
      return verified
    } catch (error) {
      return false
    }
  }, [contracts.journalistRegistry])

  // Get verification timestamp
  const getVerificationTimestamp = useCallback(async (address) => {
    if (!address || !contracts.journalistRegistry) {
      return null
    }

    try {
      const timestamp = await contracts.journalistRegistry.verificationTimestamp(address)
      return timestamp.toString() !== '0' ? Number(timestamp) * 1000 : null // Convert to milliseconds
    } catch (error) {
      return null
    }
  }, [contracts.journalistRegistry])

  return {
    provider,
    signer,
    contracts,
    isLoading,
    getTokenBalance,
    requestFaucet,
    getVotingPower,
    getVotingPowerAtBlock,
    delegate,
    createProposal,
    vote,
    getProposalState,
    getProposalVotes,
    getProposalVotesFromEvents,
    verifyJournalist,
    isJournalistVerified,
    getVerificationTimestamp,
    getProposalThreshold,
    getAllProposals,
    getProposalDetails,
    getTreasuryBalances,
    getUserActivity,
  }
}

