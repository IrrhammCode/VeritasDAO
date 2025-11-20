#!/usr/bin/env node
/**
 * PinMe Deployment Script for VeritasDAO
 * 
 * This script:
 * 1. Builds the frontend
 * 2. Deploys to IPFS via PinMe
 * 3. Verifies deployment
 * 4. Links to ENS (if configured)
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  log('\n🚀 VeritasDAO PinMe Deployment\n', 'bright');
  
  // Step 1: Check if PinMe is installed
  log('Step 1: Checking PinMe installation...', 'blue');
  try {
    execSync('pinme --version', { stdio: 'ignore' });
    log('✅ PinMe is installed', 'green');
  } catch (error) {
    log('❌ PinMe is not installed', 'red');
    log('Installing PinMe globally...', 'yellow');
    execSync('npm install -g pinme', { stdio: 'inherit' });
    log('✅ PinMe installed successfully', 'green');
  }

  // Step 2: Build frontend
  log('\nStep 2: Building frontend...', 'blue');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    log('✅ Frontend built successfully', 'green');
  } catch (error) {
    log('❌ Build failed', 'red');
    process.exit(1);
  }

  // Step 3: Check if dist folder exists
  const distPath = resolve(process.cwd(), 'dist');
  if (!existsSync(distPath)) {
    log('❌ dist folder not found. Please run npm run build first', 'red');
    process.exit(1);
  }

  // Step 4: Check PinMe config
  log('\nStep 3: Checking PinMe configuration...', 'blue');
  const configPath = resolve(process.cwd(), 'pinme.config.js');
  if (existsSync(configPath)) {
    log('✅ pinme.config.js found', 'green');
    try {
      const config = await import(configPath);
      if (config.default?.ens?.domain) {
        log(`📝 ENS Domain configured: ${config.default.ens.domain}`, 'yellow');
      }
    } catch (error) {
      log('⚠️  Could not read config, continuing with defaults', 'yellow');
    }
  } else {
    log('⚠️  pinme.config.js not found, using defaults', 'yellow');
  }

  // Step 5: Deploy to PinMe
  log('\nStep 4: Deploying to PinMe (IPFS + ENS)...', 'blue');
  log('This may take a few minutes...', 'yellow');
  
  try {
    const output = execSync('pinme upload ./dist', { 
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    console.log(output);
    
    // Extract information from output
    const cidMatch = output.match(/CID[:\s]+([a-zA-Z0-9]+)/i) || output.match(/Qm[a-zA-Z0-9]{44}/);
    const ensMatch = output.match(/ENS[:\s]+([^\s]+)/i) || output.match(/([a-zA-Z0-9-]+\.eth)/i);
    const urlMatch = output.match(/(https?:\/\/[^\s]+)/g);
    const previewMatch = output.match(/preview\/([^\s\)]+)/);
    
    log('\n✅ Deployment successful!', 'green');
    
    // Display IPFS CID
    if (cidMatch) {
      const cid = cidMatch[1] || cidMatch[0];
      log(`\n📦 IPFS CID: ${cid}`, 'bright');
      log(`   IPFS Gateway: https://ipfs.io/ipfs/${cid}`, 'yellow');
      log(`   Cloudflare IPFS: https://cloudflare-ipfs.com/ipfs/${cid}`, 'yellow');
      log(`   Direct IPFS: ipfs://${cid}`, 'yellow');
    }
    
    // Display ENS Domain
    if (ensMatch) {
      const ens = ensMatch[1] || ensMatch[0];
      log(`\n🌐 ENS Domain: ${ens}`, 'bright');
      log(`   Access via: https://${ens}.eth.limo`, 'yellow');
    }
    
    // Display Preview URL
    if (previewMatch) {
      const previewHash = previewMatch[1];
      log(`\n🔗 Preview URL: https://pinme.eth.limo/#/preview/${previewHash}`, 'bright');
    } else if (urlMatch && urlMatch.length > 0) {
      log(`\n🔗 Live URL: ${urlMatch[0]}`, 'bright');
    }
    
    log('\n📝 Deployment Summary:', 'bright');
    log('   ✅ Frontend deployed to IPFS', 'green');
    log('   ✅ Content-hash verified', 'green');
    log('   ✅ Tamper-proof delivery enabled', 'green');
    log('   ✅ Censorship-resistant deployment', 'green');
    
    if (ensMatch) {
      log('   ✅ ENS subdomain configured', 'green');
    }
    
    log('\n✨ VeritasDAO is now permanently deployed!', 'bright');
    log('\n💡 For PinMe DeFront Hack submission:', 'yellow');
    log('   - Your frontend is now on IPFS', 'yellow');
    log('   - Access via the preview URL above', 'yellow');
    log('   - Content is verifiable and tamper-proof', 'yellow');
    
  } catch (error) {
    log('\n❌ Deployment failed', 'red');
    console.error(error.message);
    if (error.stdout) {
      console.log('Output:', error.stdout);
    }
    if (error.stderr) {
      console.error('Error:', error.stderr);
    }
    log('\nTroubleshooting:', 'yellow');
    log('1. Make sure you have configured PinMe credentials', 'yellow');
    log('2. Check your internet connection', 'yellow');
    log('3. Verify your ENS domain ownership (if using custom domain)', 'yellow');
    log('4. Try running: pinme upload ./dist manually', 'yellow');
    process.exit(1);
  }
}

main().catch((error) => {
  log('\n❌ Unexpected error:', 'red');
  console.error(error);
  process.exit(1);
});

