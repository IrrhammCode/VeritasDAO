// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

/**
 * @title VeritasGovernor
 * @dev The DAO brain that manages voting and proposals
 * @notice This contract handles all governance logic for VeritasDAO
 * 
 * Architecture:
 * - Inherits from OpenZeppelin Governor contracts
 * - Uses ERC20Votes for voting power
 * - Requires TimelockController for execution delay
 * - Configurable voting parameters
 */
contract VeritasGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    /**
     * @dev Emitted when a funding proposal is created
     * @param proposalId ID of the proposal
     * @param recipient Address that will receive funding
     * @param amount Amount of funding requested
     * @param description Description of the proposal
     */
    event FundingProposalCreated(
        uint256 indexed proposalId,
        address indexed recipient,
        uint256 amount,
        string description
    );

    /**
     * @dev Constructor sets up the Governor with all parameters
     * @param token Address of VeritasToken contract
     * @param timelock Address of TimelockController contract
     * @param _votingDelay Number of blocks before voting can start (e.g., 1 block)
     * @param _votingPeriod Number of blocks voting is open (e.g., 20160 blocks = ~3 days)
     * @param _proposalThreshold Minimum tokens needed to create a proposal (e.g., 1% of supply)
     * @param quorumFraction Percentage of total supply needed for quorum (e.g., 4% = 4)
     */
    constructor(
        IVotes token,
        TimelockController timelock,
        uint48 _votingDelay,
        uint32 _votingPeriod,
        uint256 _proposalThreshold,
        uint256 quorumFraction
    )
        Governor("VeritasDAO Governor")
        GovernorSettings(
            _votingDelay,        // votingDelay: 1 block
            _votingPeriod,       // votingPeriod: 20160 blocks (~3 days)
            _proposalThreshold   // proposalThreshold: e.g., 10000 tokens (1% of 1M)
        )
        GovernorVotes(token)
        GovernorVotesQuorumFraction(quorumFraction) // quorumFraction: 4 (means 4%)
        GovernorTimelockControl(timelock)
    {}

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function votingDelay()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function votingPeriod()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function quorum(uint256 blockNumber)
        public
        view
        override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function proposalNeedsQueuing(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function _queueOperations(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal
        override(Governor, GovernorTimelockControl)
        returns (uint48)
    {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function _executeOperations(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal
        override(Governor, GovernorTimelockControl)
    {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function _cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
        internal
        override(Governor, GovernorTimelockControl)
        returns (uint256)
    {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }
}

