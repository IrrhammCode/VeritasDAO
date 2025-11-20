import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Automatically add frontend environment variables to .env
 */
function addFrontendEnv() {
  console.log('🔧 Adding frontend environment variables to .env...\n');

  // Check .env exists
  const envPath = join(rootDir, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!');
    console.log('💡 Copy env.example to .env first\n');
    return false;
  }

  // Read .env
  let envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n');

  // Parse existing .env
  const env = {};
  envLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex !== -1) {
        const key = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();
        
        // Remove quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        if (key && value) {
          env[key] = value;
        }
      }
    }
  });

  // Get addresses from backend variables or deployment.json
  let mappings = {
    'VITE_VERITAS_TOKEN_ADDRESS': env['VERITAS_TOKEN_ADDRESS'],
    'VITE_TIMELOCK_ADDRESS': env['TIMELOCK_ADDRESS'],
    'VITE_TREASURY_ADDRESS': env['TREASURY_ADDRESS'],
    'VITE_GOVERNOR_ADDRESS': env['GOVERNOR_ADDRESS'],
    'VITE_DONATION_CONTRACT_ADDRESS': env['DONATION_CONTRACT_ADDRESS'],
    'VITE_ARTICLE_REGISTRY_ADDRESS': env['ARTICLE_REGISTRY_ADDRESS'],
    'VITE_REPUTATION_CONTRACT_ADDRESS': env['REPUTATION_CONTRACT_ADDRESS'],
    'VITE_FAUCET_ADDRESS': env['FAUCET_ADDRESS'],
  };

  // Also check deployment.json for latest addresses
  const deploymentPath = join(rootDir, 'deployment.json');
  if (fs.existsSync(deploymentPath)) {
    try {
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
      const contracts = deployment.contracts || {};
      
      // Update mappings with deployment.json addresses (more reliable)
      if (contracts.VeritasToken) mappings['VITE_VERITAS_TOKEN_ADDRESS'] = contracts.VeritasToken;
      if (contracts.TimelockController) mappings['VITE_TIMELOCK_ADDRESS'] = contracts.TimelockController;
      if (contracts.Treasury) mappings['VITE_TREASURY_ADDRESS'] = contracts.Treasury;
      if (contracts.VeritasGovernor) mappings['VITE_GOVERNOR_ADDRESS'] = contracts.VeritasGovernor;
      if (contracts.DonationContract) mappings['VITE_DONATION_CONTRACT_ADDRESS'] = contracts.DonationContract;
      if (contracts.ArticleRegistry) mappings['VITE_ARTICLE_REGISTRY_ADDRESS'] = contracts.ArticleRegistry;
      if (contracts.ReputationContract) mappings['VITE_REPUTATION_CONTRACT_ADDRESS'] = contracts.ReputationContract;
      if (contracts.VeritasFaucet) mappings['VITE_FAUCET_ADDRESS'] = contracts.VeritasFaucet;
    } catch (e) {
      console.warn('Could not read deployment.json:', e.message);
    }
  }

  // Check which ones need to be added or updated
  const toAdd = [];
  const toUpdate = [];
  Object.entries(mappings).forEach(([frontendKey, newValue]) => {
    if (newValue && newValue.startsWith('0x')) {
      const currentValue = env[frontendKey];
      if (!currentValue) {
        toAdd.push({ key: frontendKey, value: newValue });
      } else if (currentValue !== newValue) {
        toUpdate.push({ key: frontendKey, oldValue: currentValue, newValue });
      }
    }
  });

  // Add VITE_NETWORK if missing
  if (!env['VITE_NETWORK']) {
    // Try to get from deployment.json
    const deploymentPath = join(rootDir, 'deployment.json');
    let network = 'sepolia';
    if (fs.existsSync(deploymentPath)) {
      try {
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
        network = deployment.network || 'sepolia';
      } catch (e) {
        // Use default
      }
    }
    toAdd.push({ key: 'VITE_NETWORK', value: network });
  }

  if (toAdd.length === 0 && toUpdate.length === 0) {
    console.log('✅ All frontend variables are already set and up to date!\n');
    return true;
  }

  if (toAdd.length > 0) {
    console.log(`📝 Adding ${toAdd.length} frontend variable(s) to .env:\n`);
    toAdd.forEach(({ key, value }) => {
      console.log(`   ${key}=${value}`);
    });
  }

  if (toUpdate.length > 0) {
    console.log(`\n🔄 Updating ${toUpdate.length} frontend variable(s) in .env:\n`);
    toUpdate.forEach(({ key, oldValue, newValue }) => {
      console.log(`   ${key}: ${oldValue} → ${newValue}`);
    });
  }

  // Find where to add (after last contract address or at end)
  let insertIndex = envLines.length;
  
  // Try to find a good insertion point (after contract addresses section)
  for (let i = envLines.length - 1; i >= 0; i--) {
    const line = envLines[i].trim();
    if (line.includes('REPUTATION_CONTRACT_ADDRESS') || 
        line.includes('Frontend Environment Variables') ||
        line.includes('VITE_')) {
      insertIndex = i + 1;
      break;
    }
  }

  // Add frontend variables
  const newLines = [];
  
  // Check if we need to add a comment header
  let hasFrontendSection = false;
  for (let i = 0; i < insertIndex; i++) {
    if (envLines[i].includes('Frontend Environment Variables')) {
      hasFrontendSection = true;
      break;
    }
  }

  // Build new content - update existing lines or add new ones
  const allUpdates = [...toAdd.map(({ key, value }) => ({ key, value, isNew: true })), 
                      ...toUpdate.map(({ key, newValue }) => ({ key, value: newValue, isNew: false }))];
  const updateKeys = new Set(allUpdates.map(u => u.key));

  for (let i = 0; i < envLines.length; i++) {
    const line = envLines[i].trim();
    
    // Check if this line needs to be updated
    let updated = false;
    for (const update of allUpdates) {
      if (line.startsWith(update.key + '=')) {
        newLines.push(`${update.key}=${update.value}`);
        updated = true;
        break;
      }
    }
    
    if (!updated) {
      newLines.push(envLines[i]);
    }
  }

  // Add any new variables that weren't in the file
  const existingKeys = new Set();
  envLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex !== -1) {
        existingKeys.add(trimmed.substring(0, equalIndex).trim());
      }
    }
  });

  // Add new variables that don't exist yet
  const newVars = toAdd.filter(({ key }) => !existingKeys.has(key));
  if (newVars.length > 0) {
    // Find a good place to add them (after last VITE_ or at end)
    let foundViteSection = false;
    for (let i = newLines.length - 1; i >= 0; i--) {
      if (newLines[i].includes('VITE_') || newLines[i].includes('Frontend Environment Variables')) {
        foundViteSection = true;
        // Insert after this section
        if (!newLines[i + 1] || newLines[i + 1].trim() === '') {
          newVars.forEach(({ key, value }) => {
            newLines.splice(i + 1, 0, `${key}=${value}`);
          });
        } else {
          newVars.forEach(({ key, value }) => {
            newLines.push(`${key}=${value}`);
          });
        }
        break;
      }
    }
    
    if (!foundViteSection) {
      newLines.push('');
      newLines.push('# Frontend Environment Variables');
      newVars.forEach(({ key, value }) => {
        newLines.push(`${key}=${value}`);
      });
    }
  }

  // Write updated .env
  fs.writeFileSync(envPath, newLines.join('\n'));
  
  console.log('\n✅ Frontend variables added to .env successfully!');
  console.log('💡 Restart your dev server (npm run dev) for changes to take effect.\n');

  return true;
}

// Run
addFrontendEnv();

