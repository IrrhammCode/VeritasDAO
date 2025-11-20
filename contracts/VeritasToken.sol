// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VeritasToken
 * @dev Governance token for VeritasDAO
 * @notice This token enables voting power and governance for the VeritasDAO platform
 * 
 * Features:
 * - ERC20 standard token functionality
 * - Burnable tokens (optional feature for tokenomics)
 * - Voting power delegation (ERC20Votes for gasless voting)
 * - Initial minting controlled by owner
 */
contract VeritasToken is ERC20, ERC20Burnable, ERC20Votes, ERC20Permit, Ownable {
    /**
     * @dev Constructor that mints initial supply to deployer
     * @param initialSupply Initial token supply to mint (e.g., 1,000,000 tokens)
     * @param deployer Address that will receive initial supply and become owner
     */
    constructor(
        uint256 initialSupply,
        address deployer
    ) ERC20("Veritas Token", "VERITAS") ERC20Permit("Veritas Token") Ownable(deployer) {
        // Mint initial supply to deployer
        _mint(deployer, initialSupply);
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     * Updates voting power when tokens are transferred
     */
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    /**
     * @dev Override required by Solidity for multiple inheritance
     * Resolves conflict between ERC20Permit and Nonces
     */
    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }

    /**
     * @dev Mint new tokens (only owner can call)
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint
     * @notice This function can be used for future token distribution
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Mint tokens for faucet (only faucet contract can call)
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint
     * @notice This function is specifically for the faucet contract
     */
    function faucetMint(address to, uint256 amount) external {
        // Only allow faucet contract to call this
        // Faucet address should be set by owner
        require(msg.sender == faucetAddress, "VeritasToken: only faucet can call this");
        _mint(to, amount);
    }
    
    // Faucet address (set by owner)
    address public faucetAddress;
    
    /**
     * @dev Set faucet address (only owner can call)
     * @param _faucetAddress Address of the faucet contract
     */
    function setFaucetAddress(address _faucetAddress) external onlyOwner {
        require(_faucetAddress != address(0), "VeritasToken: faucet cannot be zero address");
        faucetAddress = _faucetAddress;
    }
}

