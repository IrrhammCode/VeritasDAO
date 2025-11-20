// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./VeritasToken.sol";

/**
 * @title VeritasFaucet
 * @dev Faucet contract for distributing VERITAS tokens for testing/development
 * @notice Allows users to request tokens with rate limiting to prevent abuse
 * 
 * Features:
 * - Rate limiting: Users can only request tokens once per cooldown period
 * - Configurable amount: Owner can set the faucet amount
 * - Configurable cooldown: Owner can set the cooldown period
 * - Emergency pause: Owner can pause/unpause the faucet
 */
contract VeritasFaucet is Ownable {
    VeritasToken public immutable token;
    
    // Faucet configuration
    uint256 public faucetAmount; // Amount of tokens to give per request
    uint256 public cooldownPeriod; // Cooldown period in seconds
    
    // Rate limiting
    mapping(address => uint256) public lastRequestTime;
    
    // Events
    event TokensRequested(address indexed recipient, uint256 amount, uint256 timestamp);
    event FaucetAmountUpdated(uint256 newAmount);
    event CooldownPeriodUpdated(uint256 newPeriod);
    event FaucetPaused(bool paused);
    
    // Pause functionality
    bool public paused;
    
    /**
     * @dev Constructor
     * @param _token Address of VeritasToken contract
     * @param _faucetAmount Amount of tokens to give per request (in wei)
     * @param _cooldownPeriod Cooldown period in seconds (e.g., 86400 = 1 day)
     * @param _owner Address that will own this contract
     */
    constructor(
        address _token,
        uint256 _faucetAmount,
        uint256 _cooldownPeriod,
        address _owner
    ) Ownable(_owner) {
        require(_token != address(0), "VeritasFaucet: token cannot be zero address");
        require(_owner != address(0), "VeritasFaucet: owner cannot be zero address");
        
        token = VeritasToken(_token);
        faucetAmount = _faucetAmount;
        cooldownPeriod = _cooldownPeriod;
        paused = false;
    }
    
    /**
     * @dev Request tokens from faucet
     * @notice Users can request tokens once per cooldown period
     */
    function requestTokens() external {
        require(!paused, "VeritasFaucet: faucet is paused");
        require(
            block.timestamp >= lastRequestTime[msg.sender] + cooldownPeriod,
            "VeritasFaucet: cooldown period not elapsed"
        );
        
        // Update last request time
        lastRequestTime[msg.sender] = block.timestamp;
        
        // Mint tokens to the requester using faucetMint
        token.faucetMint(msg.sender, faucetAmount);
        
        emit TokensRequested(msg.sender, faucetAmount, block.timestamp);
    }
    
    /**
     * @dev Check if user can request tokens
     * @param user Address to check
     * @return canRequest True if user can request tokens
     * @return timeUntilNextRequest Time until next request is allowed (in seconds)
     */
    function canRequestTokens(address user) external view returns (bool canRequest, uint256 timeUntilNextRequest) {
        if (paused) {
            return (false, 0);
        }
        
        uint256 lastRequest = lastRequestTime[user];
        uint256 nextRequestTime = lastRequest + cooldownPeriod;
        
        if (block.timestamp >= nextRequestTime) {
            return (true, 0);
        } else {
            return (false, nextRequestTime - block.timestamp);
        }
    }
    
    /**
     * @dev Get time until next request is allowed
     * @param user Address to check
     * @return Time in seconds until next request is allowed (0 if can request now)
     */
    function getTimeUntilNextRequest(address user) external view returns (uint256) {
        if (paused) {
            return type(uint256).max; // Return max if paused
        }
        
        uint256 lastRequest = lastRequestTime[user];
        uint256 nextRequestTime = lastRequest + cooldownPeriod;
        
        if (block.timestamp >= nextRequestTime) {
            return 0;
        } else {
            return nextRequestTime - block.timestamp;
        }
    }
    
    /**
     * @dev Set the faucet amount (only owner)
     * @param _amount New amount in wei
     */
    function setFaucetAmount(uint256 _amount) external onlyOwner {
        require(_amount > 0, "VeritasFaucet: amount must be greater than zero");
        faucetAmount = _amount;
        emit FaucetAmountUpdated(_amount);
    }
    
    /**
     * @dev Set the cooldown period (only owner)
     * @param _period New cooldown period in seconds
     */
    function setCooldownPeriod(uint256 _period) external onlyOwner {
        cooldownPeriod = _period;
        emit CooldownPeriodUpdated(_period);
    }
    
    /**
     * @dev Pause the faucet (only owner)
     */
    function pause() external onlyOwner {
        paused = true;
        emit FaucetPaused(true);
    }
    
    /**
     * @dev Unpause the faucet (only owner)
     */
    function unpause() external onlyOwner {
        paused = false;
        emit FaucetPaused(false);
    }
    
    /**
     * @dev Emergency function to withdraw tokens (only owner)
     * @notice In case of emergency, owner can withdraw tokens from this contract
     * @param _amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner {
        require(_amount > 0, "VeritasFaucet: amount must be greater than zero");
        token.faucetMint(owner(), _amount);
    }
}

