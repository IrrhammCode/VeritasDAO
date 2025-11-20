import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Sync contract addresses from deployment.json to .env
 */
function syncEnv() {
  console.log('🔄 Syncing contract addresses from deployment.json to .env...\n');

  // Check deployment.json
  const deploymentPath = join(rootDir, 'deployment.json');
  if (!fs.existsSync(deploymentPath)) {
    console.error('❌ deployment.json not found!');
    console.log('💡 Run: npm run deploy:sepolia (or deploy:local)\n');
    return false;
  }

  // Read deployment.json
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
  const contracts = deployment.contracts || {};

  console.log('📦 Found deployment for network:', deployment.network);
  console.log('   Contracts to sync:\n');
  Object.keys(contracts).forEach(name => {
    console.log(`   ${name}: ${contracts[name]}`);
  });

  // Check .env exists
  const envPath = join(rootDir, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('\n❌ .env file not found!');
    console.log('💡 Copy env.example to .env first\n');
    return false;
  }

  // Read .env
  let envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n');

  // Mapping contract names to env variable names
  const contractToEnv = {
    'VeritasToken': 'VERITAS_TOKEN_ADDRESS',
    'TimelockController': 'TIMELOCK_ADDRESS',
    'Treasury': 'TREASURY_ADDRESS',
    'VeritasGovernor': 'GOVERNOR_ADDRESS',
    'DonationContract': 'DONATION_CONTRACT_ADDRESS',
    'ArticleRegistry': 'ARTICLE_REGISTRY_ADDRESS',
    'ReputationContract': 'REPUTATION_CONTRACT_ADDRESS',
  };

  // Update .env with addresses
  let updated = false;
  const updatedLines = envLines.map(line => {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      return line;
    }

    // Check if this line is a contract address
    const [key, ...valueParts] = trimmed.split('=');
    if (!key || valueParts.length === 0) {
      return line;
    }

    const envKey = key.trim();
    const currentValue = valueParts.join('=').trim();

    // Check if this env var matches a contract
    for (const [contractName, envVarName] of Object.entries(contractToEnv)) {
      if (envKey === envVarName && contracts[contractName]) {
        const newValue = contracts[contractName];
        if (currentValue !== newValue) {
          console.log(`   ✏️  Updating ${envKey}: ${currentValue || '(empty)'} → ${newValue}`);
          updated = true;
          return `${envKey}=${newValue}`;
        }
      }
    }

    return line;
  });

  if (updated) {
    // Write updated .env
    fs.writeFileSync(envPath, updatedLines.join('\n'));
    console.log('\n✅ .env file updated successfully!\n');
  } else {
    console.log('\n✅ All addresses are already up to date!\n');
  }

  // Also suggest frontend variables
  console.log('💡 Don\'t forget to add frontend variables (VITE_*) to .env:');
  console.log('   Example:');
  Object.entries(contractToEnv).forEach(([contractName, envVarName]) => {
    if (contracts[contractName]) {
      console.log(`   VITE_${envVarName.replace('_ADDRESS', '')}=${contracts[contractName]}`);
    }
  });
  console.log('   VITE_NETWORK=sepolia\n');

  return true;
}

// Run sync
syncEnv();

