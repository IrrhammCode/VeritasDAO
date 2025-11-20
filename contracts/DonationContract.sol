// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DonationContract
 * @dev On-chain donation tracking with escrow and refund mechanism
 * @notice Tracks donations per proposal, manages early access, and handles refunds
 */
contract DonationContract is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /**
     * @dev Struct to store donation information
     */
    struct Donation {
        address donor;
        uint256 amount;
        uint256 timestamp;
        bool earlyAccessPromised;
        bool earlyAccessGranted;
        bool refunded;
    }

    /**
     * @dev Struct to store escrow information per proposal
     */
    struct Escrow {
        uint256 totalAmount;
        address investigator;
        bool released;
        bool refunded;
        uint256 donationCount;
    }

    // Mapping proposal ID to escrow
    mapping(uint256 => Escrow) public escrows;

    // Mapping proposal ID to array of donations
    mapping(uint256 => Donation[]) public donations;

    // Mapping proposal ID to total donations
    mapping(uint256 => uint256) public totalDonations;

    // Mapping proposal ID => donor => early access granted
    mapping(uint256 => mapping(address => bool)) public earlyAccessGranted;

    // Mapping donor => proposal IDs they donated to
    mapping(address => uint256[]) public donorProposals;

    // Address of VeritasGovernor contract
    address public governor;

    // Minimum donation amount (to prevent spam)
    uint256 public minDonationAmount = 0.001 ether;

    /**
     * @dev Emitted when a donation is made
     */
    event DonationMade(
        uint256 indexed proposalId,
        address indexed donor,
        uint256 amount,
        bool earlyAccessPromised,
        uint256 timestamp
    );

    /**
     * @dev Emitted when early access is granted
     */
    event EarlyAccessGranted(
        uint256 indexed proposalId,
        address indexed donor
    );

    /**
     * @dev Emitted when funds are released to investigator
     */
    event FundsReleased(
        uint256 indexed proposalId,
        address indexed investigator,
        uint256 amount
    );

    /**
     * @dev Emitted when donations are refunded
     */
    event DonationRefunded(
        uint256 indexed proposalId,
        address indexed donor,
        uint256 amount
    );

    /**
     * @dev Emitted when governor address is updated
     */
    event GovernorUpdated(address indexed oldGovernor, address indexed newGovernor);

    /**
     * @dev Constructor
     * @param _governor Address of VeritasGovernor contract
     */
    constructor(address _governor) Ownable(msg.sender) {
        require(_governor != address(0), "DonationContract: governor cannot be zero address");
        governor = _governor;
    }

    /**
     * @dev Modifier to check if caller is governor
     */
    modifier onlyGovernor() {
        require(msg.sender == governor, "DonationContract: only governor can call this");
        _;
    }

    /**
     * @dev Make a donation to a proposal
     * @param proposalId ID of the proposal
     * @param investigator Address of the investigator (proposer)
     * @param earlyAccessPromised Whether early access is promised
     */
    function donate(
        uint256 proposalId,
        address investigator,
        bool earlyAccessPromised
    ) external payable nonReentrant {
        require(msg.value >= minDonationAmount, "DonationContract: donation amount too low");
        require(investigator != address(0), "DonationContract: investigator cannot be zero address");
        require(investigator != msg.sender, "DonationContract: cannot donate to yourself");

        // Initialize escrow if first donation
        if (escrows[proposalId].investigator == address(0)) {
            escrows[proposalId] = Escrow({
                totalAmount: 0,
                investigator: investigator,
                released: false,
                refunded: false,
                donationCount: 0
            });
        } else {
            // Verify investigator matches
            require(
                escrows[proposalId].investigator == investigator,
                "DonationContract: investigator mismatch"
            );
        }

        // Check escrow not already released or refunded
        require(
            !escrows[proposalId].released && !escrows[proposalId].refunded,
            "DonationContract: escrow already processed"
        );

        // Create donation record
        Donation memory newDonation = Donation({
            donor: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            earlyAccessPromised: earlyAccessPromised,
            earlyAccessGranted: false,
            refunded: false
        });

        donations[proposalId].push(newDonation);
        escrows[proposalId].totalAmount += msg.value;
        escrows[proposalId].donationCount += 1;
        totalDonations[proposalId] += msg.value;

        // Track proposals for donor
        donorProposals[msg.sender].push(proposalId);

        emit DonationMade(
            proposalId,
            msg.sender,
            msg.value,
            earlyAccessPromised,
            block.timestamp
        );
    }

    /**
     * @dev Grant early access to a donor (called by investigator or governor)
     * @param proposalId ID of the proposal
     * @param donor Address of the donor
     */
    function grantEarlyAccess(
        uint256 proposalId,
        address donor
    ) external {
        require(
            msg.sender == escrows[proposalId].investigator || msg.sender == governor,
            "DonationContract: only investigator or governor can grant early access"
        );
        require(donor != address(0), "DonationContract: donor cannot be zero address");

        // Find donation and grant early access
        bool found = false;
        for (uint256 i = 0; i < donations[proposalId].length; i++) {
            if (donations[proposalId][i].donor == donor && donations[proposalId][i].earlyAccessPromised) {
                donations[proposalId][i].earlyAccessGranted = true;
                found = true;
                break;
            }
        }

        require(found, "DonationContract: donation not found or early access not promised");
        earlyAccessGranted[proposalId][donor] = true;

        emit EarlyAccessGranted(proposalId, donor);
    }

    /**
     * @dev Release funds to investigator (called by governor when proposal succeeds)
     * @param proposalId ID of the proposal
     */
    function releaseFunds(uint256 proposalId) external onlyGovernor nonReentrant {
        Escrow storage escrow = escrows[proposalId];
        require(escrow.investigator != address(0), "DonationContract: escrow does not exist");
        require(!escrow.released, "DonationContract: funds already released");
        require(!escrow.refunded, "DonationContract: funds already refunded");
        require(escrow.totalAmount > 0, "DonationContract: no funds to release");

        escrow.released = true;
        uint256 amount = escrow.totalAmount;

        (bool success, ) = payable(escrow.investigator).call{value: amount}("");
        require(success, "DonationContract: ETH transfer failed");

        emit FundsReleased(proposalId, escrow.investigator, amount);
    }

    /**
     * @dev Refund all donations for a proposal (called by governor when proposal fails)
     * @param proposalId ID of the proposal
     */
    function refundDonations(uint256 proposalId) external onlyGovernor nonReentrant {
        Escrow storage escrow = escrows[proposalId];
        require(escrow.investigator != address(0), "DonationContract: escrow does not exist");
        require(!escrow.released, "DonationContract: funds already released");
        require(!escrow.refunded, "DonationContract: funds already refunded");

        escrow.refunded = true;
        Donation[] storage proposalDonations = donations[proposalId];

        for (uint256 i = 0; i < proposalDonations.length; i++) {
            if (!proposalDonations[i].refunded) {
                proposalDonations[i].refunded = true;
                uint256 amount = proposalDonations[i].amount;

                (bool success, ) = payable(proposalDonations[i].donor).call{value: amount}("");
                require(success, "DonationContract: refund transfer failed");

                emit DonationRefunded(proposalId, proposalDonations[i].donor, amount);
            }
        }
    }

    /**
     * @dev Get all donations for a proposal
     * @param proposalId ID of the proposal
     * @return Array of donations
     */
    function getDonations(uint256 proposalId) external view returns (Donation[] memory) {
        return donations[proposalId];
    }

    /**
     * @dev Get donation count for a proposal
     * @param proposalId ID of the proposal
     * @return Count of donations
     */
    function getDonationCount(uint256 proposalId) external view returns (uint256) {
        return donations[proposalId].length;
    }

    /**
     * @dev Get escrow information for a proposal
     * @param proposalId ID of the proposal
     * @return Escrow struct
     */
    function getEscrow(uint256 proposalId) external view returns (Escrow memory) {
        return escrows[proposalId];
    }

    /**
     * @dev Get proposals that a donor has donated to
     * @param donor Address of the donor
     * @return Array of proposal IDs
     */
    function getDonorProposals(address donor) external view returns (uint256[] memory) {
        return donorProposals[donor];
    }

    /**
     * @dev Check if a user has early access to a proposal's article
     * @param proposalId ID of the proposal
     * @param user Address of the user
     * @return Whether user has early access
     */
    function hasEarlyAccess(uint256 proposalId, address user) external view returns (bool) {
        return earlyAccessGranted[proposalId][user];
    }

    /**
     * @dev Update governor address (only owner)
     * @param newGovernor New governor address
     */
    function setGovernor(address newGovernor) external onlyOwner {
        require(newGovernor != address(0), "DonationContract: governor cannot be zero address");
        address oldGovernor = governor;
        governor = newGovernor;
        emit GovernorUpdated(oldGovernor, newGovernor);
    }

    /**
     * @dev Update minimum donation amount (only owner)
     * @param newMinAmount New minimum donation amount
     */
    function setMinDonationAmount(uint256 newMinAmount) external onlyOwner {
        minDonationAmount = newMinAmount;
    }

    /**
     * @dev Get contract ETH balance
     * @return Balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

