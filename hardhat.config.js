import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

// Validate and format private key
function getPrivateKey() {
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    console.error("\n❌ ERROR: PRIVATE_KEY not found in .env file!");
    console.error("\n📝 To fix this:");
    console.error("   1. Open your .env file");
    console.error("   2. Add your private key:");
    console.error("      PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE");
    console.error("   3. Make sure it's 64 hex characters (with or without 0x prefix)");
    console.error("   4. To get your private key from MetaMask:");
    console.error("      Account Details > Show Private Key\n");
    throw new Error("PRIVATE_KEY not found in .env file. Please add your private key to .env file.");
  }
  
  // Remove whitespace
  const cleanedKey = privateKey.trim();
  
  if (cleanedKey.length === 0) {
    console.error("\n❌ ERROR: PRIVATE_KEY is empty in .env file!");
    console.error("   Please add a valid private key.\n");
    throw new Error("PRIVATE_KEY is empty in .env file");
  }
  
  // Check if it starts with 0x, if not add it
  const formattedKey = cleanedKey.startsWith('0x') ? cleanedKey : `0x${cleanedKey}`;
  
  // Validate private key format (should be 66 characters with 0x, or 64 without)
  if (formattedKey.length !== 66) {
    console.error("\n❌ ERROR: Invalid PRIVATE_KEY format!");
    console.error(`   Current length: ${formattedKey.length} characters`);
    console.error("   Expected: 64 hex characters (with or without 0x prefix = 66 or 64 chars)");
    console.error("\n📝 Example format:");
    console.error("   PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
    console.error("   Or without 0x:");
    console.error("   PRIVATE_KEY=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
    console.error("\n💡 To get your private key from MetaMask:");
    console.error("   Account Details > Show Private Key\n");
    throw new Error(`Invalid PRIVATE_KEY format: expected 64 hex characters, got ${formattedKey.length - 2} (with 0x prefix)`);
  }
  
  // Validate hex characters
  if (!/^0x[a-fA-F0-9]{64}$/.test(formattedKey)) {
    console.error("\n❌ ERROR: Invalid PRIVATE_KEY format!");
    console.error("   Private key should contain only hexadecimal characters (0-9, a-f, A-F)");
    console.error("\n📝 Example format:");
    console.error("   PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef\n");
    throw new Error("Invalid PRIVATE_KEY format: contains non-hexadecimal characters");
  }
  
  console.log("✅ Private key format validated successfully");
  return [formattedKey];
}

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: getPrivateKey(),
      chainId: 11155111,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

