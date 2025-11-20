// PinMe configuration for VeritasDAO deployment
export default {
  // IPFS configuration
  ipfs: {
    gateway: 'https://ipfs.io',
    // You can use Pinata, Infura, Web3.Storage, or other pinning services
    pinningService: 'pinata', // Options: 'pinata', 'infura', 'web3.storage', 'nft.storage'
  },
  
  // ENS configuration (optional - set your ENS domain here)
  ens: {
    domain: 'veritasdao.eth', // Replace with your ENS domain
    // resolver: '0x...', // Your ENS resolver address (auto-detected if not set)
  },
  
  // Build output directory
  buildDir: './dist',
  
  // Additional IPFS options
  ipfsOptions: {
    // Pin to multiple services for redundancy
    pinToMultipleServices: true,
    // Enable IPNS for mutable content (optional)
    enableIPNS: false,
  },
}

