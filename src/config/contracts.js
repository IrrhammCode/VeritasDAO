// Contract addresses configuration
// Update these after deployment

// Import full ABIs from artifacts
import fullABIs from './abis.json'

export const CONTRACT_ADDRESSES = {
  // Local development (default addresses - update after deployment)
  localhost: {
    VeritasToken: "", // Will be set after deployment
    TimelockController: "", // Will be set after deployment
    Treasury: "", // Will be set after deployment
    VeritasGovernor: "", // Will be set after deployment
    DonationContract: "", // Will be set after deployment
    ArticleRegistry: "", // Will be set after deployment
    ReputationContract: "", // Will be set after deployment
    VeritasFaucet: "", // Will be set after deployment
  },
  // Sepolia testnet
  sepolia: {
    VeritasToken: import.meta.env.VITE_VERITAS_TOKEN_ADDRESS || "0xD83fb6064E565948cbc3eA4d577A20fdA303c6d4",
    TimelockController: import.meta.env.VITE_TIMELOCK_ADDRESS || "0x7AA2d4772916a7235761b86F1E2512a884F04c81",
    Treasury: import.meta.env.VITE_TREASURY_ADDRESS || "0xeF7e86116B9eb91D3b8e36cef0CD7c6c9035D7E5",
    VeritasGovernor: import.meta.env.VITE_GOVERNOR_ADDRESS || "0x5FF2f7c3415092A91b3135A2f22E22E14A152596",
    DonationContract: import.meta.env.VITE_DONATION_CONTRACT_ADDRESS || "",
    ArticleRegistry: import.meta.env.VITE_ARTICLE_REGISTRY_ADDRESS || "",
    ReputationContract: import.meta.env.VITE_REPUTATION_CONTRACT_ADDRESS || "",
    VeritasFaucet: import.meta.env.VITE_FAUCET_ADDRESS || "",
  },
  // Mainnet (when ready)
  mainnet: {
    VeritasToken: "",
    TimelockController: "",
    Treasury: "",
    VeritasGovernor: "",
    DonationContract: "",
    ArticleRegistry: "",
    ReputationContract: "",
    VeritasFaucet: "",
  },
};

// Network chain IDs
export const CHAIN_IDS = {
  sepolia: 11155111,
  localhost: 1337,
  mainnet: 1,
};

// Get current network from chainId or environment
// Always return "sepolia" for chainId 11155111 (Sepolia testnet)
export const getNetwork = (chainId = null) => {
  // If chainId is provided, use it to determine network
  if (chainId !== null) {
    // Explicitly check for Sepolia chainId (11155111)
    if (chainId === 11155111 || chainId === CHAIN_IDS.sepolia) return "sepolia";
    if (chainId === CHAIN_IDS.localhost) return "localhost";
    if (chainId === CHAIN_IDS.mainnet) return "mainnet";
  }

  // Try to get chainId from window.ethereum if available
  if (typeof window !== "undefined" && window.ethereum) {
    // We'll get chainId from WalletContext, but default to sepolia
    const envNetwork = import.meta.env.VITE_NETWORK;
    // Ensure we always use "sepolia" not "aeneid" or any other name
    return (envNetwork && envNetwork !== 'aeneid') ? envNetwork : "sepolia";
  }
  
  // Default to sepolia (never aeneid)
  const envNetwork = import.meta.env.VITE_NETWORK;
  return (envNetwork && envNetwork !== 'aeneid') ? envNetwork : "sepolia";
};

// Get contract addresses for current network
export const getContractAddresses = (chainId = null) => {
  const network = getNetwork(chainId);
  return CONTRACT_ADDRESSES[network] || CONTRACT_ADDRESSES.sepolia;
};

// Contract ABIs - use full ABI from artifacts if available, otherwise use minimal ABI
export const CONTRACT_ABIS = {
  VeritasToken: fullABIs.VeritasToken || [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function delegate(address delegatee)",
    "function getVotes(address account) view returns (uint256)",
    "function getPastVotes(address account, uint256 blockNumber) view returns (uint256)",
    "function mint(address to, uint256 amount)",
    "function faucetMint(address to, uint256 amount)",
    "function setFaucetAddress(address _faucetAddress)",
    "function faucetAddress() view returns (address)",
    "function owner() view returns (address)",
  ],
  VeritasFaucet: fullABIs.VeritasFaucet || [
    "function requestTokens()",
    "function canRequestTokens(address user) view returns (bool canRequest, uint256 timeUntilNextRequest)",
    "function getTimeUntilNextRequest(address user) view returns (uint256)",
    "function faucetAmount() view returns (uint256)",
    "function cooldownPeriod() view returns (uint256)",
    "function lastRequestTime(address) view returns (uint256)",
    "function paused() view returns (bool)",
    "function setFaucetAmount(uint256 _amount)",
    "function setCooldownPeriod(uint256 _period)",
    "function pause()",
    "function unpause()",
    "event TokensRequested(address indexed recipient, uint256 amount, uint256 timestamp)",
  ],
  VeritasGovernor: fullABIs.VeritasGovernor || [
    "function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) returns (uint256)",
    "function castVote(uint256 proposalId, uint8 support) returns (uint256)",
    "function castVoteWithReason(uint256 proposalId, uint8 support, string reason) returns (uint256)",
    "function state(uint256 proposalId) view returns (uint8)",
    "function proposalThreshold() view returns (uint256)",
    "function setProposalThreshold(uint256 newProposalThreshold)",
    "function votingDelay() view returns (uint256)",
    "function votingPeriod() view returns (uint256)",
    "function quorum(uint256 blockNumber) view returns (uint256)",
    "function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)",
    "function proposalSnapshot(uint256 proposalId) view returns (uint256)",
    "function proposalDeadline(uint256 proposalId) view returns (uint256)",
    "function hasVoted(uint256 proposalId, address account) view returns (bool)",
    "function owner() view returns (address)",
    "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)",
    "event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)",
  ],
  Treasury: fullABIs.Treasury || [
    "function withdrawEth(address payable to, uint256 amount)",
    "function withdrawToken(address token, address to, uint256 amount)",
    "function getEthBalance() view returns (uint256)",
    "function getTokenBalance(address token) view returns (uint256)",
  ],
  DonationContract: fullABIs.DonationContract || [
    "function donate(uint256 proposalId, address investigator, bool earlyAccessPromised) payable",
    "function grantEarlyAccess(uint256 proposalId, address donor)",
    "function releaseFunds(uint256 proposalId)",
    "function refundDonations(uint256 proposalId)",
    "function getDonations(uint256 proposalId) view returns (tuple(address donor, uint256 amount, uint256 timestamp, bool earlyAccessPromised, bool earlyAccessGranted, bool refunded)[])",
    "function getDonationCount(uint256 proposalId) view returns (uint256)",
    "function totalDonations(uint256 proposalId) view returns (uint256)",
    "function getEscrow(uint256 proposalId) view returns (tuple(uint256 totalAmount, address investigator, bool released, bool refunded, uint256 donationCount))",
    "function hasEarlyAccess(uint256 proposalId, address user) view returns (bool)",
    "function getDonorProposals(address donor) view returns (uint256[])",
    "event DonationMade(uint256 indexed proposalId, address indexed donor, uint256 amount, bool earlyAccessPromised, uint256 timestamp)",
    "event EarlyAccessGranted(uint256 indexed proposalId, address indexed donor)",
    "event FundsReleased(uint256 indexed proposalId, address indexed investigator, uint256 amount)",
    "event DonationRefunded(uint256 indexed proposalId, address indexed donor, uint256 amount)",
  ],
  ArticleRegistry: fullABIs.ArticleRegistry || [
    "function publishArticle(uint256 proposalId, string memory ipfsHash, string memory title, string memory category, string memory excerpt)",
    "function verifyArticle(uint256 proposalId)",
    "function getArticle(uint256 proposalId) view returns (tuple(uint256 proposalId, address investigator, string ipfsHash, string title, string category, string excerpt, uint256 publishedAt, bool isPublished, bool verified))",
    "function getInvestigatorArticles(address investigator) view returns (uint256[])",
    "function getAllPublishedProposals() view returns (uint256[])",
    "function getProposalFromIpfsHash(string memory ipfsHash) view returns (uint256)",
    "function verifyArticleOwnership(uint256 proposalId, address investigator) view returns (bool)",
    "function articleExists(uint256 proposalId) view returns (bool)",
    "function getInvestigatorArticleCount(address investigator) view returns (uint256)",
    "function getTotalPublishedCount() view returns (uint256)",
    "event ArticlePublished(uint256 indexed proposalId, address indexed investigator, string ipfsHash, string title, string category, uint256 publishedAt)",
    "event ArticleVerified(uint256 indexed proposalId, address indexed verifier)",
  ],
  ReputationContract: fullABIs.ReputationContract || [
    "function getReputation(address investigator) view returns (tuple(uint256 totalProposals, uint256 successfulProposals, uint256 defeatedProposals, uint256 totalDonationsReceived, uint256 articlesPublished, uint256 verifiedArticles, uint256 reputationScore, uint256 lastUpdated))",
    "function getTopInvestigators(uint256 limit) view returns (address[], uint256[])",
    "function getAllInvestigators() view returns (address[])",
    "function getInvestigatorCount() view returns (uint256)",
    "function isInvestigator(address) view returns (bool)",
    "event ReputationUpdated(address indexed investigator, uint256 newScore, uint256 totalProposals, uint256 articlesPublished)",
  ],
};

