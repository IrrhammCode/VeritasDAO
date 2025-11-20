import hre from "hardhat";
const { ethers } = hre;
import fs from "fs";

/**
 * @dev Script to update proposal threshold in VeritasGovernor contract
 * 
 * This script attempts to update the threshold directly.
 * If that fails (because Governor is owned by Timelock), use createThresholdProposal.js instead.
 * 
 * Usage:
 * npx hardhat run scripts/setProposalThreshold.js --network sepolia
 * 
 * Or with custom threshold:
 * THRESHOLD=100 npx hardhat run scripts/setProposalThreshold.js --network sepolia
 */
async function main() {
  // Load deployment info
  const deploymentInfo = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
  
  const [deployer] = await ethers.getSigners();
  console.log("Updating proposal threshold with account:", deployer.address);
  
  // Get Governor contract
  const governor = await ethers.getContractAt(
    "VeritasGovernor",
    deploymentInfo.contracts.VeritasGovernor
  );
  
  // Get current threshold
  const currentThreshold = await governor.proposalThreshold();
  console.log("Current proposal threshold:", ethers.formatEther(currentThreshold), "VERITAS");
  
  // New threshold (default: 100 VERITAS)
  const newThreshold = process.env.THRESHOLD 
    ? ethers.parseEther(process.env.THRESHOLD)
    : ethers.parseEther("100");
  
  console.log("New proposal threshold:", ethers.formatEther(newThreshold), "VERITAS");
  
  // Check if threshold needs to be updated
  if (currentThreshold === newThreshold) {
    console.log("Threshold is already set to", ethers.formatEther(newThreshold), "VERITAS");
    return;
  }
  
  try {
    // Check if deployer is the owner
    let owner;
    try {
      owner = await governor.owner();
      console.log("Governor owner:", owner);
      console.log("Deployer address:", deployer.address);
    } catch (e) {
      // Governor might not have owner() function if it's not Ownable
      console.log("Note: Governor may not have owner() function");
    }
    
    console.log("\nAttempting to update proposal threshold...");
    console.log("Note: setProposalThreshold can only be called by the Governor owner.");
    console.log("If this fails, you may need to create a governance proposal to update it.");
    
    // Try to call setProposalThreshold
    const tx = await governor.setProposalThreshold(newThreshold);
    console.log("Transaction sent, hash:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    // Verify new threshold
    const updatedThreshold = await governor.proposalThreshold();
    console.log("\n✅ Proposal threshold updated successfully!");
    console.log("New threshold:", ethers.formatEther(updatedThreshold), "VERITAS");
    
  } catch (error) {
    if (error.message && (error.message.includes("OwnableUnauthorizedAccount") || error.message.includes("onlyOwner") || error.message.includes("unauthorized"))) {
      console.error("\n❌ Error: You don't have permission to update the threshold directly.");
      console.error("The Governor contract is likely owned by TimelockController or another address.");
      console.error("\nTo update the threshold, you have two options:");
      console.error("\nOption 1: Create a governance proposal (recommended for production)");
      console.error("1. Create a proposal to call setProposalThreshold(100 ether)");
      console.error("2. Get the proposal approved by voters");
      console.error("3. Execute the proposal after timelock delay");
      console.error("\nOption 2: Redeploy contracts (for testing only)");
      console.error("- Run: npx hardhat run scripts/deploy.js --network localhost");
      console.error("- This will deploy new contracts with threshold = 100 VERITAS");
      console.error("- Update your .env file with new contract addresses");
    } else {
      console.error("Error updating threshold:", error.message);
      console.error("Full error:", error);
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

