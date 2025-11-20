// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ReputationContract
 * @dev Tracks reputation and performance metrics for investigators
 * @notice Calculates reputation scores based on proposals, articles, and donations
 */
contract ReputationContract is Ownable {
    /**
     * @dev Struct to store reputation information
     */
    struct Reputation {
        uint256 totalProposals;
        uint256 successfulProposals;
        uint256 defeatedProposals;
        uint256 totalDonationsReceived;
        uint256 articlesPublished;
        uint256 verifiedArticles;
        uint256 reputationScore;
        uint256 lastUpdated;
    }

    // Mapping investigator address to reputation
    mapping(address => Reputation) public reputations;

    // Array of all investigators
    address[] public investigators;

    // Mapping to check if address is registered as investigator
    mapping(address => bool) public isInvestigator;

    // Addresses of related contracts
    address public governor;
    address public articleRegistry;
    address public donationContract;

    // Reputation calculation weights
    uint256 public weightSuccessfulProposal = 100;
    uint256 public weightArticlePublished = 50;
    uint256 public weightVerifiedArticle = 25;
    uint256 public weightDonationReceived = 1; // per 0.01 ETH

    /**
     * @dev Emitted when reputation is updated
     */
    event ReputationUpdated(
        address indexed investigator,
        uint256 newScore,
        uint256 totalProposals,
        uint256 articlesPublished
    );

    /**
     * @dev Emitted when contract addresses are updated
     */
    event ContractsUpdated(
        address governor,
        address articleRegistry,
        address donationContract
    );

    /**
     * @dev Constructor
     * @param _governor Address of VeritasGovernor contract
     * @param _articleRegistry Address of ArticleRegistry contract
     * @param _donationContract Address of DonationContract
     */
    constructor(
        address _governor,
        address _articleRegistry,
        address _donationContract
    ) Ownable(msg.sender) {
        require(_governor != address(0), "ReputationContract: governor cannot be zero address");
        require(_articleRegistry != address(0), "ReputationContract: articleRegistry cannot be zero address");
        require(_donationContract != address(0), "ReputationContract: donationContract cannot be zero address");

        governor = _governor;
        articleRegistry = _articleRegistry;
        donationContract = _donationContract;
    }

    /**
     * @dev Update reputation for an investigator based on proposal outcome
     * @param investigator Address of the investigator
     * @param proposalId ID of the proposal
     * @param success Whether the proposal succeeded
     */
    function updateReputationFromProposal(
        address investigator,
        uint256 proposalId,
        bool success
    ) external {
        require(msg.sender == governor, "ReputationContract: only governor can update from proposal");
        require(investigator != address(0), "ReputationContract: investigator cannot be zero address");

        _registerInvestigator(investigator);
        Reputation storage rep = reputations[investigator];

        rep.totalProposals += 1;
        if (success) {
            rep.successfulProposals += 1;
        } else {
            rep.defeatedProposals += 1;
        }

        _calculateReputationScore(investigator);
    }

    /**
     * @dev Update reputation when article is published
     * @param investigator Address of the investigator
     * @param proposalId ID of the proposal
     */
    function updateReputationFromArticle(
        address investigator,
        uint256 proposalId
    ) external {
        require(
            msg.sender == articleRegistry,
            "ReputationContract: only articleRegistry can update from article"
        );
        require(investigator != address(0), "ReputationContract: investigator cannot be zero address");

        _registerInvestigator(investigator);
        Reputation storage rep = reputations[investigator];

        rep.articlesPublished += 1;

        _calculateReputationScore(investigator);
    }

    /**
     * @dev Update reputation when article is verified
     * @param investigator Address of the investigator
     */
    function updateReputationFromVerification(address investigator) external {
        require(
            msg.sender == articleRegistry,
            "ReputationContract: only articleRegistry can update from verification"
        );
        require(investigator != address(0), "ReputationContract: investigator cannot be zero address");

        _registerInvestigator(investigator);
        Reputation storage rep = reputations[investigator];

        rep.verifiedArticles += 1;

        _calculateReputationScore(investigator);
    }

    /**
     * @dev Update reputation based on donations received
     * @param investigator Address of the investigator
     * @param proposalId ID of the proposal
     */
    function updateReputationFromDonation(
        address investigator,
        uint256 proposalId
    ) external {
        require(
            msg.sender == donationContract,
            "ReputationContract: only donationContract can update from donation"
        );
        require(investigator != address(0), "ReputationContract: investigator cannot be zero address");

        _registerInvestigator(investigator);
        Reputation storage rep = reputations[investigator];

        // Get total donations for this proposal
        // Note: We'll need to use interface or call directly
        // For now, we'll track this separately or get from events
        // This can be enhanced with proper interface

        _calculateReputationScore(investigator);
    }

    /**
     * @dev Get reputation for an investigator
     * @param investigator Address of the investigator
     * @return Reputation struct
     */
    function getReputation(address investigator) external view returns (Reputation memory) {
        return reputations[investigator];
    }

    /**
     * @dev Get top investigators by reputation score
     * @param limit Number of top investigators to return
     * @return Array of investigator addresses
     * @return Array of reputation scores
     */
    function getTopInvestigators(uint256 limit) external view returns (address[] memory, uint256[] memory) {
        uint256 count = investigators.length;
        if (count == 0) {
            return (new address[](0), new uint256[](0));
        }

        // Create arrays for sorting
        address[] memory sortedAddresses = new address[](count);
        uint256[] memory sortedScores = new uint256[](count);

        // Initialize arrays
        for (uint256 i = 0; i < count; i++) {
            sortedAddresses[i] = investigators[i];
            sortedScores[i] = reputations[investigators[i]].reputationScore;
        }

        // Simple bubble sort (for small arrays, otherwise use more efficient algorithm)
        for (uint256 i = 0; i < count - 1; i++) {
            for (uint256 j = 0; j < count - i - 1; j++) {
                if (sortedScores[j] < sortedScores[j + 1]) {
                    // Swap scores
                    uint256 tempScore = sortedScores[j];
                    sortedScores[j] = sortedScores[j + 1];
                    sortedScores[j + 1] = tempScore;

                    // Swap addresses
                    address tempAddr = sortedAddresses[j];
                    sortedAddresses[j] = sortedAddresses[j + 1];
                    sortedAddresses[j + 1] = tempAddr;
                }
            }
        }

        // Return top N
        uint256 returnCount = limit < count ? limit : count;
        address[] memory topAddresses = new address[](returnCount);
        uint256[] memory topScores = new uint256[](returnCount);

        for (uint256 i = 0; i < returnCount; i++) {
            topAddresses[i] = sortedAddresses[i];
            topScores[i] = sortedScores[i];
        }

        return (topAddresses, topScores);
    }

    /**
     * @dev Get all investigators
     * @return Array of investigator addresses
     */
    function getAllInvestigators() external view returns (address[] memory) {
        return investigators;
    }

    /**
     * @dev Get total investigator count
     * @return Count of investigators
     */
    function getInvestigatorCount() external view returns (uint256) {
        return investigators.length;
    }

    /**
     * @dev Update contract addresses (only owner)
     */
    function setContracts(
        address _governor,
        address _articleRegistry,
        address _donationContract
    ) external onlyOwner {
        require(_governor != address(0), "ReputationContract: governor cannot be zero address");
        require(_articleRegistry != address(0), "ReputationContract: articleRegistry cannot be zero address");
        require(_donationContract != address(0), "ReputationContract: donationContract cannot be zero address");

        governor = _governor;
        articleRegistry = _articleRegistry;
        donationContract = _donationContract;

        emit ContractsUpdated(governor, articleRegistry, donationContract);
    }

    /**
     * @dev Update reputation calculation weights (only owner)
     */
    function setWeights(
        uint256 _weightSuccessfulProposal,
        uint256 _weightArticlePublished,
        uint256 _weightVerifiedArticle,
        uint256 _weightDonationReceived
    ) external onlyOwner {
        weightSuccessfulProposal = _weightSuccessfulProposal;
        weightArticlePublished = _weightArticlePublished;
        weightVerifiedArticle = _weightVerifiedArticle;
        weightDonationReceived = _weightDonationReceived;
    }

    /**
     * @dev Register a new investigator
     * @param investigator Address of the investigator
     */
    function _registerInvestigator(address investigator) internal {
        if (!isInvestigator[investigator]) {
            isInvestigator[investigator] = true;
            investigators.push(investigator);
        }
    }

    /**
     * @dev Calculate reputation score for an investigator
     * @param investigator Address of the investigator
     */
    function _calculateReputationScore(address investigator) internal {
        Reputation storage rep = reputations[investigator];

        uint256 score = 0;

        // Points from successful proposals
        score += rep.successfulProposals * weightSuccessfulProposal;

        // Points from published articles
        score += rep.articlesPublished * weightArticlePublished;

        // Points from verified articles
        score += rep.verifiedArticles * weightVerifiedArticle;

        // Points from donations received (scaled by weight)
        score += (rep.totalDonationsReceived / 0.01 ether) * weightDonationReceived;

        rep.reputationScore = score;
        rep.lastUpdated = block.timestamp;

        emit ReputationUpdated(
            investigator,
            score,
            rep.totalProposals,
            rep.articlesPublished
        );
    }
}

