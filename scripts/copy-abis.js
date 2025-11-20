import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

/**
 * Copy ABIs from artifacts to src/config/abis.json
 */
function copyABIs() {
  console.log('📋 Copying contract ABIs to frontend...\n')

  const artifactsDir = join(rootDir, 'artifacts', 'contracts')
  const contracts = [
    'VeritasToken',
    'VeritasGovernor',
    'Treasury',
    'DonationContract',
    'ArticleRegistry',
    'ReputationContract',
    'VeritasFaucet',
  ]

  const abis = {}

  contracts.forEach(contractName => {
    const artifactPath = join(artifactsDir, `${contractName}.sol`, `${contractName}.json`)
    
    if (fs.existsSync(artifactPath)) {
      try {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'))
        abis[contractName] = artifact.abi
        console.log(`✓ Loaded ABI for ${contractName}`)
      } catch (error) {
        console.error(`✗ Failed to load ABI for ${contractName}:`, error.message)
      }
    } else {
      console.warn(`⚠ ${contractName} artifact not found at ${artifactPath}`)
    }
  })

  // Write to src/config/abis.json
  const outputPath = join(rootDir, 'src', 'config', 'abis.json')
  fs.writeFileSync(outputPath, JSON.stringify(abis, null, 2))
  console.log(`\n✅ ABIs saved to ${outputPath}`)
  console.log(`\n💡 Import ABIs in contracts.js: import abis from './abis.json'`)
}

copyABIs()

