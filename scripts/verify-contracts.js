import { ethers } from 'ethers'
import fs from 'fs'

/**
 * Verify contracts are deployed on Sepolia
 */
async function verifyContracts() {
  console.log('🔍 Verifying contracts on Sepolia...\n')

  // Read deployment.json
  const deployment = JSON.parse(fs.readFileSync('deployment.json', 'utf-8'))
  const contracts = deployment.contracts

  // Use public Sepolia RPC
  const rpcUrls = [
    'https://rpc.sepolia.org',
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://sepolia.gateway.tenderly.co',
  ]

  let provider = null
  for (const url of rpcUrls) {
    try {
      provider = new ethers.JsonRpcProvider(url)
      await provider.getBlockNumber()
      console.log(`✓ Connected to RPC: ${url}\n`)
      break
    } catch (error) {
      console.warn(`✗ Failed to connect to ${url}: ${error.message}`)
    }
  }

  if (!provider) {
    console.error('❌ Could not connect to any Sepolia RPC endpoint')
    return
  }

  // Check each contract
  const results = {}
  for (const [name, address] of Object.entries(contracts)) {
    try {
      console.log(`Checking ${name}...`)
      const code = await provider.getCode(address)
      const hasCode = code !== '0x' && code !== null && code.length > 2
      
      results[name] = {
        address,
        deployed: hasCode,
        codeLength: code.length
      }

      if (hasCode) {
        console.log(`  ✓ Contract found (code length: ${code.length})`)
      } else {
        console.log(`  ✗ Contract NOT found at ${address}`)
      }
    } catch (error) {
      console.error(`  ✗ Error checking ${name}:`, error.message)
      results[name] = {
        address,
        deployed: false,
        error: error.message
      }
    }
  }

  console.log('\n=== Verification Summary ===')
  const deployed = Object.values(results).filter(r => r.deployed).length
  const total = Object.keys(results).length
  console.log(`Deployed: ${deployed}/${total}`)
  
  if (deployed < total) {
    console.log('\n⚠️  Some contracts are not deployed. Possible reasons:')
    console.log('1. Deployment transaction is still pending')
    console.log('2. Deployment transaction failed')
    console.log('3. Wrong network')
    console.log('\n💡 Check deployment transaction on Sepolia Etherscan:')
    console.log(`   https://sepolia.etherscan.io/address/${deployment.deployer}`)
  } else {
    console.log('\n✅ All contracts are deployed!')
  }

  return results
}

verifyContracts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

