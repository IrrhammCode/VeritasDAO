// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title JournalistRegistry
 * @dev Simple registry to track verified journalists
 * @notice Journalists can self-verify by calling verifyJournalist()
 */
contract JournalistRegistry is Ownable {
    /**
     * @dev Mapping to track verified journalists
     * @notice verifiedJournalists[address] = true if verified
     */
    mapping(address => bool) public verifiedJournalists;

    /**
     * @dev Mapping to track verification timestamp
     */
    mapping(address => uint256) public verificationTimestamp;

    /**
     * @dev Emitted when a journalist verifies themselves
     * @param journalist Address of the verified journalist
     * @param timestamp Block timestamp of verification
     */
    event JournalistVerified(address indexed journalist, uint256 timestamp);

    /**
     * @dev Emitted when a journalist is removed (by owner)
     * @param journalist Address of the removed journalist
     */
    event JournalistRemoved(address indexed journalist);

    /**
     * @dev Constructor sets the deployer as owner
     * @param deployer Address that will become owner
     */
    constructor(address deployer) Ownable(deployer) {}

    /**
     * @dev Allow anyone to verify themselves as a journalist
     * @notice This is a self-service verification - no approval needed
     */
    function verifyJournalist() external {
        require(!verifiedJournalists[msg.sender], "JournalistRegistry: Already verified");
        
        verifiedJournalists[msg.sender] = true;
        verificationTimestamp[msg.sender] = block.timestamp;
        
        emit JournalistVerified(msg.sender, block.timestamp);
    }

    /**
     * @dev Check if an address is a verified journalist
     * @param journalist Address to check
     * @return bool True if verified
     */
    function isVerified(address journalist) external view returns (bool) {
        return verifiedJournalists[journalist];
    }

    /**
     * @dev Remove a journalist from registry (owner only)
     * @param journalist Address to remove
     * @notice Only owner can remove journalists (for moderation)
     */
    function removeJournalist(address journalist) external onlyOwner {
        require(verifiedJournalists[journalist], "JournalistRegistry: Not verified");
        
        verifiedJournalists[journalist] = false;
        verificationTimestamp[journalist] = 0;
        
        emit JournalistRemoved(journalist);
    }

    /**
     * @dev Batch verify journalists (owner only)
     * @param journalists Array of addresses to verify
     * @notice Useful for initial setup or bulk verification
     */
    function batchVerifyJournalists(address[] calldata journalists) external onlyOwner {
        for (uint256 i = 0; i < journalists.length; i++) {
            if (!verifiedJournalists[journalists[i]]) {
                verifiedJournalists[journalists[i]] = true;
                verificationTimestamp[journalists[i]] = block.timestamp;
                emit JournalistVerified(journalists[i], block.timestamp);
            }
        }
    }
}

