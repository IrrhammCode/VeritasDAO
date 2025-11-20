import hre from "hardhat";
const { ethers } = hre;
import fs from "fs";

/**
 * @dev Script to create a governance proposal to update proposal threshold
 * 
 * Usage:
 * npx hardhat run scripts/createThresholdProposal.js --network sepolia
 * 
 * This creates a proposal to call setProposalThreshold(100 ether) on the Governor contract
 */
async function main() {
  // Load deployment info
  const deploymentInfo = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
  
  const [proposer] = await ethers.getSigners();
  console.log("Creating threshold update proposal with account:", proposer.address);
  
  // Get contracts
  const governor = await ethers.getContractAt(
    "VeritasGovernor",
    deploymentInfo.contracts.VeritasGovernor
  );
  
  const token = await ethers.getContractAt(
    "VeritasToken",
    deploymentInfo.contracts.VeritasToken
  );
  
  // Check proposer balance and threshold
  const balance = await token.balanceOf(proposer.address);
  const currentThreshold = await governor.proposalThreshold();
  const votingPower = await token.getVotes(proposer.address);
  
  console.log("\n=== Current Status ===");
  console.log("Proposer balance:", ethers.formatEther(balance), "VERITAS");
  console.log("Proposer voting power:", ethers.formatEther(votingPower), "VERITAS");
  console.log("Current proposal threshold:", ethers.formatEther(currentThreshold), "VERITAS");
  
  // Check if proposer has enough tokens
  if (votingPower < currentThreshold) {
    console.error("\n❌ Error: You don't have enough voting power to create a proposal.");
    console.error("You need at least", ethers.formatEther(currentThreshold), "VERITAS voting power.");
    console.error("Current voting power:", ethers.formatEther(votingPower), "VERITAS");
    console.error("\nSolution:");
    console.error("1. Get more tokens from faucet");
    console.error("2. Delegate your tokens to yourself: token.delegate(yourAddress)");
    process.exit(1);
  }
  
  // New threshold (100 VERITAS)
  const newThreshold = ethers.parseEther("100");
  
  if (currentThreshold === newThreshold) {
    console.log("\n✅ Threshold is already set to 100 VERITAS");
    return;
  }
  
  console.log("\n=== Proposal Details ===");
  console.log("New threshold:", ethers.formatEther(newThreshold), "VERITAS");
  console.log("Target: VeritasGovernor contract");
  console.log("Function: setProposalThreshold(uint256)");
  
  // Prepare proposal calldata
  // We want to call: governor.setProposalThreshold(100 ether)
  const governorInterface = new ethers.Interface([
    "function setProposalThreshold(uint256 newProposalThreshold)"
  ]);
  const calldata = governorInterface.encodeFunctionData("setProposalThreshold", [newThreshold]);
  
  // Create proposal
  const targets = [deploymentInfo.contracts.VeritasGovernor];
  const values = [0]; // No ETH sent
  const calldatas = [calldata];
  const description = `Update Proposal Threshold\n\nThis proposal updates the minimum VERITAS tokens required to create a proposal from ${ethers.formatEther(currentThreshold)} to ${ethers.formatEther(newThreshold)} VERITAS.\n\nThis change will make it easier for community members to participate in governance by lowering the barrier to entry for proposal creation.`;
  
  console.log("\n=== Creating Proposal ===");
  console.log("Description:", description);
  
  try {
    const tx = await governor.propose(targets, values, calldatas, description);
    console.log("Transaction sent, hash:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    // Find proposal ID from events
    const proposalCreatedEvent = receipt.logs.find(
      log => {
        try {
          const parsed = governor.interface.parseLog(log);
          return parsed && parsed.name === "ProposalCreated";
        } catch {
          return false;
        }
      }
    );
    
    if (proposalCreatedEvent) {
      const parsed = governor.interface.parseLog(proposalCreatedEvent);
      const proposalId = parsed.args.proposalId;
      console.log("\n✅ Proposal created successfully!");
      console.log("Proposal ID:", proposalId.toString());
      console.log("\nNext steps:");
      console.log("1. Wait for voting delay to pass");
      console.log("2. Vote on the proposal using: governor.castVote(proposalId, 1)");
      console.log("   - support: 0 = Against, 1 = For, 2 = Abstain");
      console.log("3. After voting period, if approved, queue the proposal");
      console.log("4. After timelock delay, execute the proposal");
      console.log("\nYou can check proposal status with:");
      console.log(`  governor.state(${proposalId})`);
    } else {
      console.log("\n⚠️  Proposal created but could not extract proposal ID from events");
      console.log("Check the transaction receipt for details");
    }
    
  } catch (error) {
    console.error("\n❌ Error creating proposal:", error.message);
    if (error.message && error.message.includes("Governor: proposer votes below proposal threshold")) {
      console.error("\nYou don't have enough voting power to create a proposal.");
      console.error("Make sure you have delegated your tokens to yourself.");
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


