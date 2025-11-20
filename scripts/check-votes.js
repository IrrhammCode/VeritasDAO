import hre from "hardhat";
import fs from "fs";
const { ethers } = hre;

/**
 * Script to check vote details for a proposal
 * Usage: npx hardhat run scripts/check-votes.js --network sepolia
 */

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Checking votes with account:", signer.address);
  let deploymentInfo;
  try {
    deploymentInfo = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
  } catch (error) {
    console.error("Error loading deployment.json. Please deploy contracts first.");
    process.exit(1);
  }

  const governorAddress = deploymentInfo.contracts.VeritasGovernor;
  const tokenAddress = deploymentInfo.contracts.VeritasToken;

  // Get contracts
  const VeritasGovernor = await ethers.getContractFactory("VeritasGovernor");
  const governor = VeritasGovernor.attach(governorAddress);

  const VeritasToken = await ethers.getContractFactory("VeritasToken");
  const token = VeritasToken.attach(tokenAddress);

  // Get proposal ID from command line or use the one from logs
  const proposalId = process.argv[2] || "79732176885398013139310774938220142382270789048947943354857486517704442188407";
  console.log("\n=== Checking Proposal ===");
  console.log("Proposal ID:", proposalId);

  try {
    // Get proposal details
    const [state, votes, snapshot, deadline, hasVoted] = await Promise.all([
      governor.state(proposalId),
      governor.proposalVotes(proposalId),
      governor.proposalSnapshot(proposalId),
      governor.proposalDeadline(proposalId),
      governor.hasVoted(proposalId, signer.address).catch(() => false)
    ]);

    const states = [
      'Pending', 'Active', 'Canceled', 'Defeated',
      'Succeeded', 'Queued', 'Expired', 'Executed'
    ];

    console.log("\n=== Proposal State ===");
    console.log("State:", states[state]);
    console.log("Snapshot Block:", snapshot.toString());
    console.log("Deadline Block:", deadline.toString());
    console.log("Has Voted (current account):", hasVoted);

    // Get current block
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log("Current Block:", currentBlock);
    console.log("Blocks until deadline:", (Number(deadline) - currentBlock).toString());

    // Get vote counts from contract
    console.log("\n=== Vote Counts (from proposalVotes()) ===");
    console.log("For:", ethers.formatEther(votes.forVotes), "VERITAS");
    console.log("Against:", ethers.formatEther(votes.againstVotes), "VERITAS");
    console.log("Abstain:", ethers.formatEther(votes.abstainVotes), "VERITAS");
    console.log("Total:", ethers.formatEther(votes.forVotes + votes.againstVotes + votes.abstainVotes), "VERITAS");

    // Query VoteCast events
    console.log("\n=== VoteCast Events ===");
    const voteFilter = governor.filters.VoteCast();
    const allVoteEvents = await governor.queryFilter(voteFilter);
    
    // Filter events for this proposal
    const proposalEvents = allVoteEvents.filter(e => {
      try {
        const parsed = governor.interface.parseLog(e);
        return parsed && parsed.args.proposalId && parsed.args.proposalId.toString() === proposalId;
      } catch {
        return false;
      }
    });

    console.log(`Found ${proposalEvents.length} VoteCast events for this proposal`);

    if (proposalEvents.length > 0) {
      let eventFor = BigInt(0);
      let eventAgainst = BigInt(0);
      let eventAbstain = BigInt(0);

      for (let index = 0; index < proposalEvents.length; index++) {
        const event = proposalEvents[index];
        try {
          const parsed = governor.interface.parseLog(event);
          if (parsed && parsed.name === 'VoteCast') {
            const voter = parsed.args.voter;
            const support = parsed.args.support;
            const weight = parsed.args.weight;
            const blockNumber = event.blockNumber;

            console.log(`\nEvent ${index + 1}:`);
            console.log("  Voter:", voter);
            console.log("  Support:", support, `(${support === 0 ? 'AGAINST' : support === 1 ? 'FOR' : 'ABSTAIN'})`);
            console.log("  Weight:", ethers.formatEther(weight), "VERITAS");
            console.log("  Block:", blockNumber);

            // Check voting power at snapshot block
            const votingPowerAtSnapshot = await token.getPastVotes(voter, snapshot).catch(() => BigInt(0));
            console.log("  Voting Power at Snapshot Block:", ethers.formatEther(votingPowerAtSnapshot), "VERITAS");

            if (support === 0) eventAgainst += weight;
            else if (support === 1) eventFor += weight;
            else if (support === 2) eventAbstain += weight;
          }
        } catch (parseError) {
          console.error(`Error parsing event ${index + 1}:`, parseError);
        }
      }

      console.log("\n=== Vote Counts (from Events) ===");
      console.log("For:", ethers.formatEther(eventFor), "VERITAS");
      console.log("Against:", ethers.formatEther(eventAgainst), "VERITAS");
      console.log("Abstain:", ethers.formatEther(eventAbstain), "VERITAS");
      console.log("Total:", ethers.formatEther(eventFor + eventAgainst + eventAbstain), "VERITAS");

      // Compare
      console.log("\n=== Comparison ===");
      const contractTotal = votes.forVotes + votes.againstVotes + votes.abstainVotes;
      const eventTotal = eventFor + eventAgainst + eventAbstain;

      if (contractTotal.toString() !== eventTotal.toString()) {
        console.log("⚠️  MISMATCH DETECTED!");
        console.log("Contract total:", ethers.formatEther(contractTotal), "VERITAS");
        console.log("Events total:", ethers.formatEther(eventTotal), "VERITAS");
        console.log("\nPossible reasons:");
        console.log("1. Votes were cast after deadline");
        console.log("2. Votes were cast before snapshot block");
        console.log("3. Voting power changed between snapshot and vote");
        console.log("4. Contract state not updated correctly");
      } else {
        console.log("✓ Vote counts match!");
      }
    } else {
      console.log("No VoteCast events found for this proposal");
    }

    // Check proposal timing
    console.log("\n=== Proposal Timing Analysis ===");
    if (Number(snapshot) > currentBlock) {
      console.log("⚠️  Snapshot block is in the future! This shouldn't happen.");
    }
    if (Number(deadline) < currentBlock) {
      console.log("⚠️  Deadline has passed! Proposal should not be Active.");
    }
    if (Number(snapshot) > Number(deadline)) {
      console.log("⚠️  Snapshot block is after deadline! This is invalid.");
    }

  } catch (error) {
    console.error("Error checking proposal:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

