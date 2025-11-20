// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Treasury
 * @dev Vault contract that holds all DAO funds (ETH, VERITAS, or stablecoins)
 * @notice This contract is owned by VeritasGovernor, not by a single person
 * 
 * Security:
 * - Only the Governor contract (via Timelock) can withdraw funds
 * - No single person can access the funds directly
 * - All withdrawals must go through DAO governance voting
 */
contract Treasury is Ownable {
    using SafeERC20 for IERC20;

    /**
     * @dev Emitted when ETH is received
     * @param from Address that sent ETH
     * @param amount Amount of ETH received
     */
    event EthReceived(address indexed from, uint256 amount);

    /**
     * @dev Emitted when ETH is withdrawn
     * @param to Address that received ETH
     * @param amount Amount of ETH withdrawn
     */
    event EthWithdrawn(address indexed to, uint256 amount);

    /**
     * @dev Emitted when ERC20 tokens are withdrawn
     * @param token Address of the token contract
     * @param to Address that received tokens
     * @param amount Amount of tokens withdrawn
     */
    event TokenWithdrawn(address indexed token, address indexed to, uint256 amount);

    /**
     * @dev Constructor sets the owner (should be TimelockController)
     * @param governor Address of the TimelockController that will own this contract
     */
    constructor(address governor) Ownable(governor) {
        require(governor != address(0), "Treasury: governor cannot be zero address");
    }

    /**
     * @dev Receive ETH directly
     * @notice Allows the contract to receive ETH
     */
    receive() external payable {
        emit EthReceived(msg.sender, msg.value);
    }

    /**
     * @dev Fallback function to receive ETH
     */
    fallback() external payable {
        emit EthReceived(msg.sender, msg.value);
    }

    /**
     * @dev Withdraw ETH from treasury (only owner can call)
     * @param to Address to send ETH to
     * @param amount Amount of ETH to withdraw
     * @notice Only the Governor (via Timelock) can execute this
     */
    function withdrawEth(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "Treasury: cannot withdraw to zero address");
        require(amount > 0, "Treasury: amount must be greater than zero");
        require(address(this).balance >= amount, "Treasury: insufficient balance");

        (bool success, ) = to.call{value: amount}("");
        require(success, "Treasury: ETH transfer failed");

        emit EthWithdrawn(to, amount);
    }

    /**
     * @dev Withdraw ERC20 tokens from treasury (only owner can call)
     * @param token Address of the ERC20 token contract
     * @param to Address to send tokens to
     * @param amount Amount of tokens to withdraw
     * @notice Only the Governor (via Timelock) can execute this
     */
    function withdrawToken(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(token != address(0), "Treasury: token cannot be zero address");
        require(to != address(0), "Treasury: cannot withdraw to zero address");
        require(amount > 0, "Treasury: amount must be greater than zero");

        IERC20(token).safeTransfer(to, amount);

        emit TokenWithdrawn(token, to, amount);
    }

    /**
     * @dev Get the ETH balance of the treasury
     * @return Balance in wei
     */
    function getEthBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Get the balance of a specific ERC20 token
     * @param token Address of the ERC20 token contract
     * @return Balance of tokens
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}

