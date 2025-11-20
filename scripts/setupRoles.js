const { ethers } = require("hardhat");

/**
 * @dev Helper script to setup TimelockController roles after deployment
 * 
 * Usage:
 * node scripts/setupRoles.js
 * 
 * This script:
 * 1. Grants PROPOSER role to Governor
 * 2. Grants EXECUTOR role to Governor
 * 3. Grants CANCELLER role to Governor
 * 4. Renounces admin role (makes Timelock self-administered)
 */
async function main() {
  const fs = require("fs");
  const deploymentInfo = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
  
  const [deployer] = await ethers.getSigners();
  console.log("Setting up roles with account:", deployer.address);

  const timelock = await ethers.getContractAt(
    "TimelockController",
    deploymentInfo.contracts.TimelockController
  );
  const governor = await ethers.getContractAt(
    "VeritasGovernor",
    deploymentInfo.contracts.VeritasGovernor
  );

  const governorAddress = await governor.getAddress();
  const timelockAddress = await timelock.getAddress();

  console.log("\n=== Setting up TimelockController Roles ===");
  console.log("Timelock:", timelockAddress);
  console.log("Governor:", governorAddress);

  // Grant PROPOSER role to Governor
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const hasProposerRole = await timelock.hasRole(PROPOSER_ROLE, governorAddress);
  
  if (!hasProposerRole) {
    console.log("\n1. Granting PROPOSER role to Governor...");
    const tx1 = await timelock.grantRole(PROPOSER_ROLE, governorAddress);
    await tx1.wait();
    console.log("✓ PROPOSER role granted");
  } else {
    console.log("\n✓ PROPOSER role already granted");
  }

  // Grant EXECUTOR role to Governor
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const hasExecutorRole = await timelock.hasRole(EXECUTOR_ROLE, governorAddress);
  
  if (!hasExecutorRole) {
    console.log("\n2. Granting EXECUTOR role to Governor...");
    const tx2 = await timelock.grantRole(EXECUTOR_ROLE, governorAddress);
    await tx2.wait();
    console.log("✓ EXECUTOR role granted");
  } else {
    console.log("\n✓ EXECUTOR role already granted");
  }

  // Grant CANCELLER role to Governor
  const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
  const hasCancellerRole = await timelock.hasRole(CANCELLER_ROLE, governorAddress);
  
  if (!hasCancellerRole) {
    console.log("\n3. Granting CANCELLER role to Governor...");
    const tx3 = await timelock.grantRole(CANCELLER_ROLE, governorAddress);
    await tx3.wait();
    console.log("✓ CANCELLER role granted");
  } else {
    console.log("\n✓ CANCELLER role already granted");
  }

  // Renounce admin role
  const ADMIN_ROLE = await timelock.TIMELOCK_ADMIN_ROLE();
  const hasAdminRole = await timelock.hasRole(ADMIN_ROLE, deployer.address);
  
  if (hasAdminRole) {
    console.log("\n4. Renouncing admin role...");
    const tx4 = await timelock.renounceRole(ADMIN_ROLE, deployer.address);
    await tx4.wait();
    console.log("✓ Admin role renounced - Timelock is now self-administered");
  } else {
    console.log("\n✓ Admin role already renounced");
  }

  console.log("\n=== Role Setup Complete ===");
  console.log("TimelockController is now fully configured for DAO governance.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

