import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Generate frontend environment variables from .env
 */
function generateFrontendEnv() {
  console.log('🌐 Generating frontend environment variables...\n');

  // Read .env
  const envPath = join(rootDir, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!');
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envLines = envContent.split('\n');

  // Parse .env
  const env = {};
  envLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  // Mapping backend to frontend variables
  const mappings = {
    'VERITAS_TOKEN_ADDRESS': 'VITE_VERITAS_TOKEN_ADDRESS',
    'TIMELOCK_ADDRESS': 'VITE_TIMELOCK_ADDRESS',
    'TREASURY_ADDRESS': 'VITE_TREASURY_ADDRESS',
    'GOVERNOR_ADDRESS': 'VITE_GOVERNOR_ADDRESS',
    'DONATION_CONTRACT_ADDRESS': 'VITE_DONATION_CONTRACT_ADDRESS',
    'ARTICLE_REGISTRY_ADDRESS': 'VITE_ARTICLE_REGISTRY_ADDRESS',
    'REPUTATION_CONTRACT_ADDRESS': 'VITE_REPUTATION_CONTRACT_ADDRESS',
  };

  // Check which frontend vars are missing
  const missing = [];
  const existing = [];

  Object.entries(mappings).forEach(([backendKey, frontendKey]) => {
    const backendValue = env[backendKey];
    const frontendValue = env[frontendKey];

    if (backendValue && backendValue !== '' && backendValue.startsWith('0x')) {
      if (!frontendValue || frontendValue === '') {
        missing.push({ key: frontendKey, value: backendValue });
      } else {
        existing.push({ key: frontendKey, value: frontendValue });
      }
    }
  });

  // Check network
  if (!env['VITE_NETWORK']) {
    // Try to infer from deployment.json
    const deploymentPath = join(rootDir, 'deployment.json');
    if (fs.existsSync(deploymentPath)) {
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
      missing.push({ key: 'VITE_NETWORK', value: deployment.network || 'sepolia' });
    } else {
      missing.push({ key: 'VITE_NETWORK', value: 'sepolia' });
    }
  } else {
    existing.push({ key: 'VITE_NETWORK', value: env['VITE_NETWORK'] });
  }

  if (missing.length === 0) {
    console.log('✅ All frontend variables are already set!\n');
    console.log('Current frontend variables:');
    existing.forEach(({ key, value }) => {
      console.log(`   ${key} = ${value}`);
    });
    return true;
  }

  console.log('📝 Missing frontend variables:\n');
  missing.forEach(({ key, value }) => {
    console.log(`   ${key}=${value}`);
  });

  // Ask to append to .env
  console.log('\n💡 Add these to your .env file:');
  console.log('   (Copy and paste the lines above)\n');

  // Generate snippet
  const snippet = missing.map(({ key, value }) => `${key}=${value}`).join('\n');
  console.log('Or add this block to .env:\n');
  console.log('# Frontend Environment Variables');
  console.log(snippet);
  console.log('');

  return false;
}

// Run
generateFrontendEnv();

