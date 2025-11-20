const { ethers } = require("hardhat");

/**
 * @dev Example script to vote on a proposal
 * 
 * Usage:
 * node scripts/vote.js <proposalId> <support>
 * 
 * support: 0 = Against, 1 = For, 2 = Abstain
 * 
 * Example:
 * node scripts/vote.js 1 1
 */
async function main() {
  const fs = require("fs");
  const deploymentInfo = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
  
  const [voter] = await ethers.getSigners();
  console.log("Voting with account:", voter.address);

  const governor = await ethers.getContractAt(
    "VeritasGovernor",
    deploymentInfo.contracts.VeritasGovernor
  );

  const proposalId = process.argv[2];
  const support = parseInt(process.argv[3]);

  if (!proposalId || isNaN(support) || support < 0 || support > 2) {
    console.error("Usage: node scripts/vote.js <proposalId> <support>");
    console.error("support: 0 = Against, 1 = For, 2 = Abstain");
    process.exit(1);
  }

  const supportNames = ["Against", "For", "Abstain"];
  console.log("Proposal ID:", proposalId);
  console.log("Vote:", supportNames[support]);

  // Check proposal state
  const state = await governor.state(proposalId);
  const states = [
    "Pending", "Active", "Canceled", "Defeated", 
    "Succeeded", "Queued", "Expired", "Executed"
  ];
  console.log("Proposal state:", states[state]);

  if (state !== 1n) { // 1 = Active
    console.error("Error: Proposal is not in Active state");
    process.exit(1);
  }

  // Check voting power
  const token = await ethers.getContractAt(
    "VeritasToken",
    deploymentInfo.contracts.VeritasToken
  );
  const votingPower = await token.getVotes(voter.address);
  console.log("Voting power:", ethers.formatEther(votingPower), "VERITAS");

  if (votingPower === 0n) {
    console.error("Error: No voting power. Delegate tokens to yourself first.");
    console.log("Use: token.delegate(voterAddress)");
    process.exit(1);
  }

  // Cast vote
  console.log("\nCasting vote...");
  const tx = await governor.castVote(proposalId, support);
  const receipt = await tx.wait();
  console.log("Vote cast! Transaction hash:", receipt.hash);

  // Get vote count
  const proposal = await governor.proposalVotes(proposalId);
  console.log("\nCurrent vote counts:");
  console.log("Against:", proposal.againstVotes.toString());
  console.log("For:", proposal.forVotes.toString());
  console.log("Abstain:", proposal.abstainVotes.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

