# VeritasDAO Smart Contract Architecture

## Overview

VeritasDAO is a decentralized journalism guild that uses on-chain governance to fund investigative journalism proposals and archive completed reports. The architecture follows professional standards with separation of concerns between governance, treasury, and execution.

## Architecture Diagram

```
┌─────────────────┐
│ VeritasToken   │  ERC20 + ERC20Votes (Governance Token)
│ ($VERITAS)      │  - Voting power delegation
└────────┬────────┘  - Burnable tokens
         │
         │ Provides voting power
         │
┌────────▼─────────────────────────┐
│ VeritasGovernor                  │  DAO Brain
│ (Governance Contract)            │  - Proposal creation
│                                  │  - Voting mechanism
│                                  │  - Proposal execution
└────────┬─────────────────────────┘
         │
         │ Queues proposals
         │
┌────────▼─────────────────────────┐
│ TimelockController               │  Execution Delay
│                                  │  - 1 day delay
│                                  │  - Security buffer
└────────┬─────────────────────────┘
         │
         │ Executes after delay
         │
┌────────▼─────────────────────────┐
│ Treasury                         │  DAO Vault
│ (Owned by Timelock)              │  - Holds ETH/tokens
│                                  │  - Secure withdrawals
└──────────────────────────────────┘
```

## Contract Components

### 1. VeritasToken.sol

**Purpose**: Governance token that enables voting power

**Features**:
- ERC20 standard token
- ERC20Burnable (optional token burning)
- ERC20Votes (gasless voting via delegation)
- Ownable (initial minting controlled by deployer)

**Key Functions**:
- `mint(address to, uint256 amount)`: Mint new tokens (owner only)
- `burn(uint256 amount)`: Burn tokens (anyone)
- `delegate(address delegatee)`: Delegate voting power

### 2. Treasury.sol

**Purpose**: Secure vault that holds all DAO funds

**Security Model**:
- Owned by TimelockController (not a person)
- Only Governor can withdraw (via Timelock)
- No single point of failure

**Key Functions**:
- `receive()`: Accept ETH deposits
- `withdrawEth(address to, uint256 amount)`: Withdraw ETH (owner only)
- `withdrawToken(address token, address to, uint256 amount)`: Withdraw ERC20 tokens (owner only)
- `getEthBalance()`: View ETH balance
- `getTokenBalance(address token)`: View token balance

### 3. VeritasGovernor.sol

**Purpose**: Core governance contract that manages proposals and voting

**Inherits From**:
- `Governor`: Base governance functionality
- `GovernorSettings`: Configurable voting parameters
- `GovernorCountingSimple`: Simple vote counting (For/Against/Abstain)
- `GovernorVotes`: Voting power from ERC20Votes
- `GovernorVotesQuorumFraction`: Quorum requirements
- `GovernorTimelockControl`: Timelock integration

**Configuration**:
- **Voting Delay**: 1 block (proposals can't be voted immediately)
- **Voting Period**: 20,160 blocks (~3 days)
- **Proposal Threshold**: 100 VERITAS (lowered for easier testing)
- **Quorum**: 4% of total token supply

**Key Functions**:
- `propose(...)`: Create a new proposal
- `castVote(uint256 proposalId, uint8 support)`: Vote on a proposal
- `execute(...)`: Execute an approved proposal
- `queue(...)`: Queue a proposal for timelock

### 4. TimelockController.sol

**Purpose**: Execution delay mechanism for security

**Features**:
- 1 day minimum delay before execution
- Prevents immediate execution of malicious proposals
- Gives DAO members time to react

**Roles**:
- **PROPOSER**: Can queue operations (Governor)
- **EXECUTOR**: Can execute operations (Governor)
- **CANCELLER**: Can cancel operations (Governor)
- **ADMIN**: Can manage roles (renounced after setup)

## Workflow Example

### Scenario: Journalist Requests Funding

1. **Journalist Holds Tokens**: Journalist must hold at least 10,000 VERITAS (proposal threshold)

2. **Create Proposal**: Journalist calls `governor.propose()` with:
   - Target: Treasury contract address
   - Value: 5 ETH
   - Calldata: `withdrawEth(journalistAddress, 5 ETH)`
   - Description: "Funding request for [Investigation Title]"

3. **Voting Period**: DAO members vote For/Against/Abstain
   - Voting lasts 3 days
   - Requires 4% quorum to be valid

4. **Proposal Approved**: If majority votes For and quorum is met

5. **Queue Proposal**: Proposal is queued in TimelockController
   - 1 day delay starts

6. **Timelock Period**: DAO members can review the queued proposal
   - If malicious, members can sell tokens or take action

7. **Execute**: After 1 day, anyone can call `execute()` to send 5 ETH from Treasury to journalist

## Security Features

1. **No Single Point of Failure**: Treasury owned by Timelock, not a person
2. **Execution Delay**: 1 day buffer prevents immediate malicious actions
3. **Quorum Requirement**: Prevents minority from controlling DAO
4. **Proposal Threshold**: Prevents spam proposals
5. **OpenZeppelin Audits**: Uses battle-tested contracts

## Deployment

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Deploy to local network
npm run deploy:local

# Deploy to Sepolia testnet
npm run deploy:sepolia
```

## Configuration

Edit `scripts/deploy.js` to customize:
- Initial token supply
- Voting delay/period
- Proposal threshold
- Quorum percentage
- Timelock delay

## Testing

```bash
npm run test
```

## Integration with Frontend

The frontend can interact with these contracts using:
- `ethers.js` or `web3.js` for contract interaction
- `wagmi` or `useDapp` for React hooks
- Connect wallet to submit proposals and vote

## License

MIT

