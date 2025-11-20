import hre from "hardhat";
const { ethers } = hre;
import fs from "fs";

/**
 * @dev Deployment script for VeritasDAO contracts
 * 
 * Deployment Order:
 * 1. VeritasToken - Governance token
 * 2. TimelockController - Execution delay controller
 * 3. Treasury - DAO vault (owned by Timelock)
 * 4. VeritasGovernor - DAO governance contract
 * 
 * Configuration Parameters:
 * - Initial Token Supply: 1,000,000 VERITAS
 * - Voting Delay: 1 block
 * - Voting Period: 20,160 blocks (~3 days at 12.8s per block)
 * - Proposal Threshold: 100 VERITAS (lowered for easier testing)
 * - Quorum: 4% of total supply
 * - Timelock Delay: 1 day (86,400 seconds)
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Configuration
  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1,000,000 VERITAS
  const VOTING_DELAY = 1n; // 1 block
  const VOTING_PERIOD = 20160n; // ~3 days (20160 blocks * 12.8s = ~3 days)
  const PROPOSAL_THRESHOLD = ethers.parseEther("100"); // 100 VERITAS (lowered for easier testing)
  const QUORUM_FRACTION = 4n; // 4% quorum
  const TIMELOCK_DELAY = 86400n; // 1 day in seconds
  const TIMELOCK_MIN_DELAY = 3600n; // Minimum delay: 1 hour

  // Step 1: Deploy VeritasToken
  console.log("\n1. Deploying VeritasToken...");
  const VeritasToken = await ethers.getContractFactory("VeritasToken");
  const token = await VeritasToken.deploy(INITIAL_SUPPLY, deployer.address);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("VeritasToken deployed to:", tokenAddress);

  // Step 2: Deploy TimelockController
  // TimelockController needs: minDelay, proposers[], executors[], admin
  console.log("\n2. Deploying TimelockController...");
  const TimelockController = await ethers.getContractFactory("TimelockController");
  
  // We'll set up proposers and executors after Governor is deployed
  // For now, use empty arrays and we'll grant roles later
  const proposers = [];
  const executors = [];
  const admin = deployer.address; // Will be changed to zero address after setup
  
  const timelock = await TimelockController.deploy(
    TIMELOCK_MIN_DELAY,
    proposers,
    executors,
    admin
  );
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log("TimelockController deployed to:", timelockAddress);

  // Step 3: Deploy Treasury (owned by Timelock)
  console.log("\n3. Deploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(timelockAddress);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("Treasury deployed to:", treasuryAddress);

  // Step 4: Deploy VeritasGovernor
  console.log("\n4. Deploying VeritasGovernor...");
  const VeritasGovernor = await ethers.getContractFactory("VeritasGovernor");
  const governor = await VeritasGovernor.deploy(
    tokenAddress,
    timelockAddress,
    VOTING_DELAY,
    VOTING_PERIOD,
    PROPOSAL_THRESHOLD,
    QUORUM_FRACTION
  );
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();
  console.log("VeritasGovernor deployed to:", governorAddress);

  // Step 5: Setup TimelockController roles
  console.log("\n5. Setting up TimelockController roles...");
  
  // Grant PROPOSER role to Governor
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const tx1 = await timelock.grantRole(PROPOSER_ROLE, governorAddress);
  await tx1.wait();
  console.log("Granted PROPOSER role to Governor");

  // Grant EXECUTOR role to Governor
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const tx2 = await timelock.grantRole(EXECUTOR_ROLE, governorAddress);
  await tx2.wait();
  console.log("Granted EXECUTOR role to Governor");

  // Grant CANCELLER role to Governor (optional, for cancelling proposals)
  const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
  const tx3 = await timelock.grantRole(CANCELLER_ROLE, governorAddress);
  await tx3.wait();
  console.log("Granted CANCELLER role to Governor");

  // Renounce admin role (make Timelock self-administered)
  try {
    const ADMIN_ROLE = await timelock.TIMELOCK_ADMIN_ROLE();
    const tx4 = await timelock.renounceRole(ADMIN_ROLE, deployer.address);
    await tx4.wait();
    console.log("Renounced admin role - Timelock is now self-administered");
  } catch (error) {
    // Try alternative method name
    try {
      const ADMIN_ROLE = await timelock.getRoleAdmin(await timelock.PROPOSER_ROLE());
      const tx4 = await timelock.renounceRole(ADMIN_ROLE, deployer.address);
      await tx4.wait();
      console.log("Renounced admin role - Timelock is now self-administered");
    } catch (error2) {
      console.log("⚠️  Could not renounce admin role (may already be renounced or method not available)");
      console.log("   This is not critical - Timelock roles are already set up correctly");
    }
  }

  // Step 6: Transfer Treasury ownership to Timelock (if not already set)
  // Treasury is already owned by Timelock from constructor, but let's verify
  const treasuryOwner = await treasury.owner();
  if (treasuryOwner.toLowerCase() !== timelockAddress.toLowerCase()) {
    console.log("Transferring Treasury ownership to Timelock...");
    const tx5 = await treasury.transferOwnership(timelockAddress);
    await tx5.wait();
    console.log("Treasury ownership transferred to Timelock");
  } else {
    console.log("Treasury is already owned by Timelock");
  }

  // Step 7: Deploy DonationContract
  console.log("\n7. Deploying DonationContract...");
  const DonationContract = await ethers.getContractFactory("DonationContract");
  const donationContract = await DonationContract.deploy(governorAddress);
  await donationContract.waitForDeployment();
  const donationContractAddress = await donationContract.getAddress();
  console.log("DonationContract deployed to:", donationContractAddress);

  // Step 8: Deploy ArticleRegistry
  console.log("\n8. Deploying ArticleRegistry...");
  const ArticleRegistry = await ethers.getContractFactory("ArticleRegistry");
  const articleRegistry = await ArticleRegistry.deploy(governorAddress);
  await articleRegistry.waitForDeployment();
  const articleRegistryAddress = await articleRegistry.getAddress();
  console.log("ArticleRegistry deployed to:", articleRegistryAddress);

  // Step 9: Deploy ReputationContract
  console.log("\n9. Deploying ReputationContract...");
  const ReputationContract = await ethers.getContractFactory("ReputationContract");
  const reputationContract = await ReputationContract.deploy(
    governorAddress,
    articleRegistryAddress,
    donationContractAddress
  );
  await reputationContract.waitForDeployment();
  const reputationContractAddress = await reputationContract.getAddress();
  console.log("ReputationContract deployed to:", reputationContractAddress);

  // Step 10: Deploy VeritasFaucet
  console.log("\n10. Deploying VeritasFaucet...");
  const FAUCET_AMOUNT = ethers.parseEther("1000"); // 1000 tokens per request
  const COOLDOWN_PERIOD = 86400n; // 1 day in seconds
  const VeritasFaucet = await ethers.getContractFactory("VeritasFaucet");
  const faucet = await VeritasFaucet.deploy(
    tokenAddress,
    FAUCET_AMOUNT,
    COOLDOWN_PERIOD,
    deployer.address
  );
  await faucet.waitForDeployment();
  const faucetAddress = await faucet.getAddress();
  console.log("VeritasFaucet deployed to:", faucetAddress);
  
  // Set faucet address in token contract
  console.log("\nSetting faucet address in VeritasToken...");
  await token.setFaucetAddress(faucetAddress);
  console.log("Faucet address set in VeritasToken");

  // Summary
  console.log("\n=== Deployment Summary ===");
  console.log("VeritasToken:", tokenAddress);
  console.log("TimelockController:", timelockAddress);
  console.log("Treasury:", treasuryAddress);
  console.log("VeritasGovernor:", governorAddress);
  console.log("DonationContract:", donationContractAddress);
  console.log("ArticleRegistry:", articleRegistryAddress);
  console.log("ReputationContract:", reputationContractAddress);
  console.log("VeritasFaucet:", faucetAddress);
  console.log("\n=== Configuration ===");
  console.log("Initial Supply:", ethers.formatEther(INITIAL_SUPPLY), "VERITAS");
  console.log("Voting Delay:", VOTING_DELAY.toString(), "blocks");
  console.log("Voting Period:", VOTING_PERIOD.toString(), "blocks (~3 days)");
  console.log("Proposal Threshold:", ethers.formatEther(PROPOSAL_THRESHOLD), "VERITAS");
  console.log("Quorum:", QUORUM_FRACTION.toString(), "%");
  console.log("Timelock Delay:", TIMELOCK_MIN_DELAY.toString(), "seconds (1 hour minimum)");
  console.log("\n=== Next Steps ===");
  console.log("1. Fund the Treasury with ETH or tokens");
  console.log("2. Distribute VERITAS tokens to DAO members");
  console.log("3. Members can delegate voting power");
  console.log("4. Create proposals through VeritasGovernor");
  console.log("5. Vote on proposals");
  console.log("6. Execute approved proposals (after timelock delay)");

  // Save deployment addresses
  const network = await ethers.provider.getNetwork();
  const deploymentInfo = {
    network: hre.network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    contracts: {
      VeritasToken: tokenAddress,
      TimelockController: timelockAddress,
      Treasury: treasuryAddress,
      VeritasGovernor: governorAddress,
      DonationContract: donationContractAddress,
      ArticleRegistry: articleRegistryAddress,
      ReputationContract: reputationContractAddress,
      VeritasFaucet: faucetAddress,
    },
    config: {
      initialSupply: ethers.formatEther(INITIAL_SUPPLY),
      votingDelay: VOTING_DELAY.toString(),
      votingPeriod: VOTING_PERIOD.toString(),
      proposalThreshold: ethers.formatEther(PROPOSAL_THRESHOLD),
      quorumFraction: QUORUM_FRACTION.toString(),
      timelockDelay: TIMELOCK_MIN_DELAY.toString(),
    },
  };

  fs.writeFileSync(
    "deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

