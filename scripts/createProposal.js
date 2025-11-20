const { ethers } = require("hardhat");

/**
 * @dev Example script to create a funding proposal
 * 
 * Usage:
 * node scripts/createProposal.js <recipient> <amount> <description>
 * 
 * Example:
 * node scripts/createProposal.js 0x123... 5000000000000000000 "Funding for investigation"
 */
async function main() {
  // Load deployment info
  const fs = require("fs");
  const deploymentInfo = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
  
  const [proposer] = await ethers.getSigners();
  console.log("Creating proposal with account:", proposer.address);

  // Get contracts
  const governor = await ethers.getContractAt(
    "VeritasGovernor",
    deploymentInfo.contracts.VeritasGovernor
  );
  const treasury = await ethers.getContractAt(
    "Treasury",
    deploymentInfo.contracts.Treasury
  );

  // Parse arguments
  const recipient = process.argv[2];
  const amount = process.argv[3]; // in wei
  const description = process.argv[4] || "Funding request for investigative journalism";

  if (!recipient || !amount) {
    console.error("Usage: node scripts/createProposal.js <recipient> <amount> <description>");
    process.exit(1);
  }

  // Check if proposer has enough tokens
  const token = await ethers.getContractAt(
    "VeritasToken",
    deploymentInfo.contracts.VeritasToken
  );
  const balance = await token.balanceOf(proposer.address);
  const threshold = await governor.proposalThreshold();
  
  console.log("Proposer balance:", ethers.formatEther(balance), "VERITAS");
  console.log("Proposal threshold:", ethers.formatEther(threshold), "VERITAS");

  if (balance < threshold) {
    console.error("Error: Proposer does not have enough tokens to create a proposal");
    process.exit(1);
  }

  // Prepare proposal calldata
  // We want to call: treasury.withdrawEth(recipient, amount)
  const treasuryInterface = new ethers.Interface([
    "function withdrawEth(address payable to, uint256 amount) external"
  ]);
  const calldata = treasuryInterface.encodeFunctionData("withdrawEth", [
    recipient,
    amount
  ]);

  // Create proposal
  const targets = [await treasury.getAddress()];
  const values = [0]; // No ETH sent with call
  const calldatas = [calldata];
  const descriptionHash = ethers.id(description);

  console.log("\nCreating proposal...");
  console.log("Target:", targets[0]);
  console.log("Recipient:", recipient);
  console.log("Amount:", ethers.formatEther(amount), "ETH");
  console.log("Description:", description);

  const tx = await governor.propose(
    targets,
    values,
    calldatas,
    description
  );

  const receipt = await tx.wait();
  console.log("\nProposal created! Transaction hash:", receipt.hash);

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
    console.log("Proposal ID:", proposalId.toString());
    console.log("\nNext steps:");
    console.log("1. Wait for voting delay to pass");
    console.log("2. DAO members can vote using: governor.castVote(proposalId, support)");
    console.log("   - support: 0 = Against, 1 = For, 2 = Abstain");
    console.log("3. After voting period, if approved, queue the proposal");
    console.log("4. After timelock delay, execute the proposal");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

