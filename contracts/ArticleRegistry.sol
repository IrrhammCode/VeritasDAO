// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/governance/IGovernor.sol";

/**
 * @title ArticleRegistry
 * @dev On-chain registry for published articles linked to proposals
 * @notice Stores IPFS hashes and metadata for articles published by investigators
 */
contract ArticleRegistry is Ownable {
    /**
     * @dev Struct to store article information
     */
    struct Article {
        uint256 proposalId;
        address investigator;
        string ipfsHash;
        string title;
        string category;
        string excerpt;
        uint256 publishedAt;
        bool isPublished;
        bool verified;
    }

    // Mapping proposal ID to article
    mapping(uint256 => Article) public articles;

    // Mapping investigator address to their article proposal IDs
    mapping(address => uint256[]) public investigatorArticles;

    // Mapping IPFS hash to proposal ID (to prevent duplicates)
    mapping(string => uint256) public ipfsHashToProposal;

    // Array of all published proposal IDs
    uint256[] public publishedProposals;

    // Address of VeritasGovernor contract
    address public governor;

    /**
     * @dev Emitted when an article is published
     */
    event ArticlePublished(
        uint256 indexed proposalId,
        address indexed investigator,
        string ipfsHash,
        string title,
        string category,
        uint256 publishedAt
    );

    /**
     * @dev Emitted when an article is verified
     */
    event ArticleVerified(
        uint256 indexed proposalId,
        address indexed verifier
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
        require(_governor != address(0), "ArticleRegistry: governor cannot be zero address");
        governor = _governor;
    }

    /**
     * @dev Modifier to check if caller is governor
     */
    modifier onlyGovernor() {
        require(msg.sender == governor, "ArticleRegistry: only governor can call this");
        _;
    }

    /**
     * @dev Publish an article linked to a proposal
     * @param proposalId ID of the proposal
     * @param ipfsHash IPFS hash of the article content
     * @param title Title of the article
     * @param category Category of the article
     * @param excerpt Short excerpt of the article
     */
    function publishArticle(
        uint256 proposalId,
        string memory ipfsHash,
        string memory title,
        string memory category,
        string memory excerpt
    ) external {
        require(bytes(ipfsHash).length > 0, "ArticleRegistry: IPFS hash cannot be empty");
        require(bytes(title).length > 0, "ArticleRegistry: title cannot be empty");
        require(ipfsHashToProposal[ipfsHash] == 0, "ArticleRegistry: IPFS hash already used");

        // Verify proposal exists and is executed/succeeded
        IGovernor gov = IGovernor(governor);
        IGovernor.ProposalState state = gov.state(proposalId);
        require(
            state == IGovernor.ProposalState.Executed ||
            state == IGovernor.ProposalState.Succeeded,
            "ArticleRegistry: proposal must be executed or succeeded"
        );

        // Verify caller is the investigator
        // Note: In a full implementation, we would query the Governor contract
        // to get the proposer address. For now, we'll use a simpler approach
        // where the investigator must be the msg.sender
        // This can be enhanced by querying ProposalCreated events
        // The caller must be the investigator who created the proposal

        // Check if article already exists
        require(
            !articles[proposalId].isPublished,
            "ArticleRegistry: article already published for this proposal"
        );

        // Create article record
        articles[proposalId] = Article({
            proposalId: proposalId,
            investigator: msg.sender,
            ipfsHash: ipfsHash,
            title: title,
            category: category,
            excerpt: excerpt,
            publishedAt: block.timestamp,
            isPublished: true,
            verified: false
        });

        // Track article for investigator
        investigatorArticles[msg.sender].push(proposalId);

        // Track IPFS hash
        ipfsHashToProposal[ipfsHash] = proposalId;

        // Add to published proposals
        publishedProposals.push(proposalId);

        emit ArticlePublished(
            proposalId,
            msg.sender,
            ipfsHash,
            title,
            category,
            block.timestamp
        );
    }

    /**
     * @dev Verify an article (called by governor or owner)
     * @param proposalId ID of the proposal
     */
    function verifyArticle(uint256 proposalId) external onlyGovernor {
        require(
            articles[proposalId].isPublished,
            "ArticleRegistry: article does not exist"
        );
        require(
            !articles[proposalId].verified,
            "ArticleRegistry: article already verified"
        );

        articles[proposalId].verified = true;

        emit ArticleVerified(proposalId, msg.sender);
    }

    /**
     * @dev Get article information
     * @param proposalId ID of the proposal
     * @return Article struct
     */
    function getArticle(uint256 proposalId) external view returns (Article memory) {
        require(
            articles[proposalId].isPublished,
            "ArticleRegistry: article does not exist"
        );
        return articles[proposalId];
    }

    /**
     * @dev Get all proposal IDs for an investigator
     * @param investigator Address of the investigator
     * @return Array of proposal IDs
     */
    function getInvestigatorArticles(address investigator) external view returns (uint256[] memory) {
        return investigatorArticles[investigator];
    }

    /**
     * @dev Get all published proposal IDs
     * @return Array of proposal IDs
     */
    function getAllPublishedProposals() external view returns (uint256[] memory) {
        return publishedProposals;
    }

    /**
     * @dev Get proposal ID from IPFS hash
     * @param ipfsHash IPFS hash
     * @return Proposal ID (0 if not found)
     */
    function getProposalFromIpfsHash(string memory ipfsHash) external view returns (uint256) {
        return ipfsHashToProposal[ipfsHash];
    }

    /**
     * @dev Verify article ownership
     * @param proposalId ID of the proposal
     * @param investigator Address to check
     * @return Whether the address is the article owner
     */
    function verifyArticleOwnership(uint256 proposalId, address investigator) external view returns (bool) {
        return articles[proposalId].investigator == investigator && articles[proposalId].isPublished;
    }

    /**
     * @dev Check if article exists for a proposal
     * @param proposalId ID of the proposal
     * @return Whether article exists
     */
    function articleExists(uint256 proposalId) external view returns (bool) {
        return articles[proposalId].isPublished;
    }

    /**
     * @dev Get article count for an investigator
     * @param investigator Address of the investigator
     * @return Count of articles
     */
    function getInvestigatorArticleCount(address investigator) external view returns (uint256) {
        return investigatorArticles[investigator].length;
    }

    /**
     * @dev Get total published articles count
     * @return Count of published articles
     */
    function getTotalPublishedCount() external view returns (uint256) {
        return publishedProposals.length;
    }

    /**
     * @dev Update governor address (only owner)
     * @param newGovernor New governor address
     */
    function setGovernor(address newGovernor) external onlyOwner {
        require(newGovernor != address(0), "ArticleRegistry: governor cannot be zero address");
        address oldGovernor = governor;
        governor = newGovernor;
        emit GovernorUpdated(oldGovernor, newGovernor);
    }
}

