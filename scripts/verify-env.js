import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Verify .env configuration
 */
function verifyEnv() {
  console.log('🔍 Verifying .env configuration...\n');

  // Check if .env exists
  const envPath = join(rootDir, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!');
    console.log('💡 Copy env.example to .env:');
    console.log('   Windows: copy env.example .env');
    console.log('   Linux/Mac: cp env.example .env\n');
    return false;
  }

  // Read .env file
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n');

  // Parse .env (more robust parsing)
  const env = {};
  envLines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    // Handle key=value format
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) {
      return; // No = found, skip
    }

    const key = trimmed.substring(0, equalIndex).trim();
    let value = trimmed.substring(equalIndex + 1).trim();

    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && value) {
      env[key] = value;
    }
  });

  // Required variables
  const required = {
    backend: [
      'SEPOLIA_RPC_URL',
      'PRIVATE_KEY',
    ],
    contracts: [
      'VERITAS_TOKEN_ADDRESS',
      'TIMELOCK_ADDRESS',
      'TREASURY_ADDRESS',
      'GOVERNOR_ADDRESS',
      'DONATION_CONTRACT_ADDRESS',
      'ARTICLE_REGISTRY_ADDRESS',
      'REPUTATION_CONTRACT_ADDRESS',
    ],
  };

  console.log('📋 Checking required variables...\n');

  // Check backend variables
  let allGood = true;
  console.log('Backend Variables:');
  required.backend.forEach(key => {
    const value = env[key];
    if (!value || value === '' || value.includes('YOUR_')) {
      console.log(`  ❌ ${key}: Not set or placeholder`);
      allGood = false;
    } else {
      // Mask sensitive values
      const displayValue = key === 'PRIVATE_KEY' 
        ? `${value.slice(0, 6)}...${value.slice(-4)}` 
        : value;
      console.log(`  ✅ ${key}: ${displayValue}`);
    }
  });

  console.log('\nContract Addresses:');
  required.contracts.forEach(key => {
    const value = env[key];
    if (!value || value === '') {
      console.log(`  ⚠️  ${key}: Not set (will be populated after deployment)`);
    } else if (!value.startsWith('0x') || value.length !== 42) {
      console.log(`  ❌ ${key}: Invalid address format`);
      allGood = false;
    } else {
      console.log(`  ✅ ${key}: ${value}`);
    }
  });

  // Check deployment.json
  const deploymentPath = join(rootDir, 'deployment.json');
  if (fs.existsSync(deploymentPath)) {
    console.log('\n📦 Checking deployment.json...');
    try {
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
      const contracts = deployment.contracts || {};
      
      console.log('  Deployment found for network:', deployment.network);
      console.log('  Contracts deployed:');
      Object.keys(contracts).forEach(contractName => {
        const address = contracts[contractName];
        if (address) {
          console.log(`    ✅ ${contractName}: ${address}`);
        }
      });

      // Suggest syncing
      const missingInEnv = required.contracts.filter(key => {
        const contractName = key.replace('_ADDRESS', '').replace(/_/g, '');
        const envKey = key;
        return !env[envKey] && contracts[contractName];
      });

      if (missingInEnv.length > 0) {
        console.log('\n💡 Suggestion: Update .env with addresses from deployment.json');
        missingInEnv.forEach(key => {
          const contractName = key.replace('_ADDRESS', '').replace(/_/g, '');
          console.log(`   ${key} = ${contracts[contractName]}`);
        });
      }
    } catch (error) {
      console.log('  ⚠️  Could not read deployment.json:', error.message);
    }
  } else {
    console.log('\n📦 deployment.json not found');
    console.log('   Run: npm run deploy:sepolia (or deploy:local)');
  }

  // Frontend variables check
  console.log('\n🌐 Frontend Variables (VITE_*):');
  const frontendVars = [
    'VITE_NETWORK',
    'VITE_VERITAS_TOKEN_ADDRESS',
    'VITE_GOVERNOR_ADDRESS',
    'VITE_DONATION_CONTRACT_ADDRESS',
    'VITE_ARTICLE_REGISTRY_ADDRESS',
    'VITE_REPUTATION_CONTRACT_ADDRESS',
  ];

  let frontendCount = 0;
  frontendVars.forEach(key => {
    const value = env[key];
    if (value && value !== '') {
      // Mask long addresses
      const displayValue = value.length > 20 
        ? `${value.slice(0, 10)}...${value.slice(-8)}` 
        : value;
      console.log(`  ✅ ${key}: ${displayValue}`);
      frontendCount++;
    } else {
      console.log(`  ⚠️  ${key}: Not set`);
    }
  });

  // Debug: Show all VITE_ variables found
  const allViteVars = Object.keys(env).filter(key => key.startsWith('VITE_'));
  if (allViteVars.length > 0) {
    console.log('\n🔍 All VITE_* variables found in .env:');
    allViteVars.forEach(key => {
      const value = env[key];
      const displayValue = value.length > 20 
        ? `${value.slice(0, 10)}...${value.slice(-8)}` 
        : value;
      console.log(`   ${key} = ${displayValue}`);
    });
  }

  if (frontendCount === 0) {
    console.log('\n💡 Frontend variables not set. Add VITE_ prefixed variables to .env');
    console.log('   Example: VITE_VERITAS_TOKEN_ADDRESS=0x...');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (allGood && frontendCount > 0) {
    console.log('✅ Configuration looks good!');
  } else if (allGood) {
    console.log('⚠️  Backend config OK, but frontend variables missing');
  } else {
    console.log('❌ Some required variables are missing or invalid');
    console.log('   Please update .env file with correct values');
  }
  console.log('='.repeat(50) + '\n');

  return allGood;
}

// Run verification
verifyEnv();

