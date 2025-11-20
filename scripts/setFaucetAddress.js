import hre from "hardhat";
const { ethers } = hre;
import fs from "fs";

/**
 * @dev Script to set faucet address in VeritasToken contract
 * 
 * Usage:
 * node scripts/setFaucetAddress.js <tokenAddress> <faucetAddress>
 * 
 * Or it will read from deployment.json automatically
 */
async function main() {
  // Load deployment info
  let deploymentInfo;
  try {
    const deploymentData = fs.readFileSync("deployment.json", "utf8");
    deploymentInfo = JSON.parse(deploymentData);
  } catch (error) {
    console.error("Error reading deployment.json:", error.message);
    console.log("Please provide addresses manually or deploy contracts first.");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Setting faucet address with account:", deployer.address);

  // Get addresses from command line or deployment.json
  const tokenAddress = process.argv[2] || deploymentInfo.contracts.VeritasToken;
  const faucetAddress = process.argv[3] || deploymentInfo.contracts.VeritasFaucet;

  if (!tokenAddress || !faucetAddress) {
    console.error("Error: Token address and Faucet address are required");
    console.log("Usage: node scripts/setFaucetAddress.js <tokenAddress> <faucetAddress>");
    process.exit(1);
  }

  console.log("Token address:", tokenAddress);
  console.log("Faucet address:", faucetAddress);

  // Get token contract
  const VeritasToken = await ethers.getContractFactory("VeritasToken");
  const token = VeritasToken.attach(tokenAddress);

  // Check current faucet address (if function exists)
  let currentFaucetAddress;
  try {
    currentFaucetAddress = await token.faucetAddress();
    console.log("Current faucet address in token:", currentFaucetAddress);

    if (currentFaucetAddress.toLowerCase() === faucetAddress.toLowerCase()) {
      console.log("✅ Faucet address is already set correctly!");
      return;
    }
  } catch (error) {
    console.log("⚠️  Contract doesn't have faucetAddress() function - this is an old version");
    console.log("Will try to set faucet address directly...");
  }

  // Check if deployer is owner
  const owner = await token.owner();
  console.log("Token owner:", owner);
  
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error("❌ Error: You are not the owner of the token contract!");
    console.error("Please use the owner account to set faucet address.");
    process.exit(1);
  }

  // Set faucet address
  console.log("\nSetting faucet address...");
  const tx = await token.setFaucetAddress(faucetAddress);
  console.log("Transaction sent, hash:", tx.hash);
  
  console.log("Waiting for confirmation...");
  await tx.wait();
  
  console.log("✅ Faucet address set successfully!");
  
  // Verify
  const newFaucetAddress = await token.faucetAddress();
  console.log("Verified faucet address:", newFaucetAddress);
  
  if (newFaucetAddress.toLowerCase() === faucetAddress.toLowerCase()) {
    console.log("✅ Verification successful!");
  } else {
    console.error("❌ Verification failed!");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

