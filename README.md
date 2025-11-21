# VeritasDAO - Decentralized Journalism Platform

> **Full-Stack Decentralized Platform** - Complete Smart Contract Implementation + Censorship-Resistant Frontend

🌐 **Live Demo**: [https://c4vqb6iq.pinit.eth.limo](https://c4vqb6iq.pinit.eth.limo)

📹 **Video Demo**: [Watch on YouTube](https://youtu.be/nTFYY4_7Yfc?si=DIF5weZq4Su3TUdn)

VeritasDAO is a **complete full-stack decentralized platform** for funding, publishing, and permanently archiving investigative journalism. Unlike frontend-only solutions, VeritasDAO implements a complete on-chain governance system with OpenZeppelin contracts, combined with a censorship-resistant frontend deployed via PinMe to IPFS and ENS.

## 🎯 Mission

Investigative journalism is under threat. Journalists, whistleblowers, and activists who publish sensitive information ("Veritas" - the Truth) are frequently silenced. Centralized hosting providers can be pressured to take down websites, erasing critical reports.

**VeritasDAO** is a decentralized platform for funding, publishing, and permanently archiving vital investigative journalism.

## ✨ Features

### On-Chain Governance (Smart Contracts)
- **Complete DAO Implementation**: OpenZeppelin Governor with full governance functionality
- **Token-Based Voting**: ERC20Votes token with delegation support
- **Secure Treasury**: Timelock-protected vault for DAO funds
- **On-Chain Proposals**: All proposals, votes, and executions are on-chain and immutable

### Frontend Features
- **Proposal Submission**: Reporters can submit proposals to get funding for their next big story
- **DAO Voting**: DAO Members can vote on which proposals to fund (on-chain)
- **Permanent Archive**: The Public can read all published reports, free from the fear that they will one day disappear
- **3D Visualizations**: Beautiful 3D network visualization representing decentralization
- **Modern UI**: Sleek, professional design with dark mode theme

## 🛠️ Tech Stack

### Smart Contracts
- **Solidity**: ^0.8.20
- **OpenZeppelin**: Battle-tested governance contracts
- **Hardhat**: Development and deployment framework
- **Ethers.js**: Contract interaction library

### Frontend
- **React 18**: Modern UI framework
- **Vite**: Fast build tool
- **3D Graphics**: Three.js + React Three Fiber
- **Animations**: Framer Motion
- **Web3**: Wagmi + Ethers.js for blockchain integration
- **Deployment**: PinMe (IPFS + ENS)
- **Styling**: CSS3 with CSS Variables

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The app will be available at `http://localhost:5173`

## 🔗 Smart Contracts

VeritasDAO implements a complete on-chain governance system using OpenZeppelin contracts. All contracts are deployed on Sepolia testnet and verified on Etherscan.

### Contract Addresses (Sepolia Testnet)

| Contract | Address | Description |
|----------|---------|-------------|
| **VeritasToken** | [`0x44277D23d6058a4e8097a23D8226783E273Fb8Ce`](https://sepolia.etherscan.io/address/0x44277D23d6058a4e8097a23D8226783E273Fb8Ce) | ERC20 governance token with voting power delegation |
| **VeritasGovernor** | [`0x4EC69FA138562377db9BfB5C001B68fe5d7dc405`](https://sepolia.etherscan.io/address/0x4EC69FA138562377db9BfB5C001B68fe5d7dc405) | DAO governance contract for proposals and voting |
| **Treasury** | [`0xDF1D2d695f550c0479426C191517C5fA045c0621`](https://sepolia.etherscan.io/address/0xDF1D2d695f550c0479426C191517C5fA045c0621) | Secure vault for DAO funds (Timelock-protected) |
| **TimelockController** | [`0xeDDC384f35b05cb11dDf00462885e77A0461b876`](https://sepolia.etherscan.io/address/0xeDDC384f35b05cb11dDf00462885e77A0461b876) | Execution delay controller (1 hour delay) |
| **DonationContract** | [`0xBAC9f9dB0277F72C6EF95b11eD27804AA65761f1`](https://sepolia.etherscan.io/address/0xBAC9f9dB0277F72C6EF95b11eD27804AA65761f1) | Donation & escrow system for proposals |
| **ArticleRegistry** | [`0x544643005A496e8E9612b4Db25b4Cc202C7379A3`](https://sepolia.etherscan.io/address/0x544643005A496e8E9612b4Db25b4Cc202C7379A3) | On-chain registry for published articles |
| **ReputationContract** | [`0x7ac8DFcafa2695A17F7d437EBBE28A51A52b12a3`](https://sepolia.etherscan.io/address/0x7ac8DFcafa2695A17F7d437EBBE28A51A52b12a3) | Reputation tracking for journalists |
| **VeritasFaucet** | [`0x4100d2Ca37216e6D1C414CC165f2F9E9E801E2b8`](https://sepolia.etherscan.io/address/0x4100d2Ca37216e6D1C414CC165f2F9E9E801E2b8) | Test token faucet (1000 VERITAS per request) |
| **JournalistRegistry** | [`0x219B6f5f23705F103b676065eC6742F6f1cFfD16`](https://sepolia.etherscan.io/address/0x219B6f5f23705F103b676065eC6742F6f1cFfD16) | On-chain journalist verification registry |

### Key Features

- ✅ **On-Chain Governance**: All proposals, votes, and executions are on-chain and immutable
- ✅ **Token-Based Voting**: ERC20Votes token with delegation support
- ✅ **Secure Execution**: Timelock delay prevents immediate malicious actions
- ✅ **Quorum & Thresholds**: Prevents spam and minority control
- ✅ **Battle-Tested**: OpenZeppelin audited contracts

## 📦 Deployment

**Backend**: Smart contracts deployed on Ethereum Sepolia testnet  
**Frontend**: Deployed to IPFS via PinMe (Decentralized Frontend)

### PinMe Deployment

The frontend is deployed as a **DeFront** (Decentralized Frontend) using PinMe, making it:
- **Tamper-Proof**: Content-hash verified, cannot be hijacked
- **Censorship-Resistant**: No single entity can shut it down
- **Truly Decentralized**: Full-stack decentralization from contracts to UI

## 📁 Project Structure

```
veritasdao/
├── contracts/                 # Smart contracts (Solidity)
│   ├── VeritasToken.sol       # ERC20 governance token
│   ├── VeritasGovernor.sol    # DAO governance contract
│   ├── Treasury.sol           # DAO treasury vault
│   ├── DonationContract.sol   # Donation & escrow system
│   ├── ArticleRegistry.sol    # On-chain article registry
│   ├── ReputationContract.sol # Investigator reputation
│   └── VeritasFaucet.sol      # Test token faucet
├── src/                       # Frontend React application
│   ├── components/            # React components
│   │   ├── Dashboard.jsx      # Main dashboard
│   │   ├── Proposals.jsx      # Proposals voting
│   │   ├── Reports.jsx        # Published reports
│   │   ├── SubmitProposal.jsx # Proposal submission
│   │   ├── Network3D.jsx      # 3D visualization
│   │   └── ...                # Other UI components
│   ├── config/                # Configuration files
│   │   ├── contracts.js       # Contract addresses & ABIs
│   │   ├── wagmi.js           # Wagmi Web3 config
│   │   └── abis.json          # Contract ABIs
│   ├── contexts/              # React contexts
│   │   ├── WalletContext.jsx  # Wallet connection
│   │   └── ToastContext.jsx   # Toast notifications
│   ├── hooks/                 # Custom React hooks
│   │   └── useContracts.js    # Contract interaction hook
│   ├── utils/                 # Utility functions
│   │   ├── contractHelpers.js # Contract helpers
│   │   └── metamaskNetwork.js # MetaMask network utils
│   ├── App.jsx                # Main app component
│   ├── main.jsx               # Entry point
│   └── index.css              # Global styles
├── scripts/                    # Deployment & utility scripts
│   ├── deploy.js              # Contract deployment
│   ├── sync-env.js            # Sync deployment addresses
│   ├── copy-abis.js           # Copy ABIs to frontend
│   └── ...                    # Other utility scripts
├── test/                       # Smart contract tests
├── public/                     # Static assets
├── dist/                       # Build output (for PinMe)
├── hardhat.config.js           # Hardhat configuration
├── vite.config.js              # Vite configuration
├── pinme.config.js             # PinMe deployment config
└── package.json                # Dependencies & scripts
```

## 🎨 Design System

The application uses a dark theme with the following color palette:

- **Primary Background**: `#0a0a0f`
- **Secondary Background**: `#11111a`
- **Accent Blue**: `#3b82f6`
- **Accent Purple**: `#8b5cf6`
- **Accent Green**: `#10b981`

## 🎯 What Makes VeritasDAO Different

**Full-Stack Decentralized Platform:**

Unlike frontend-only solutions, VeritasDAO implements a complete decentralized platform:

- ✅ **Smart Contracts**: Complete on-chain governance with 9 deployed contracts
- ✅ **Frontend**: Censorship-resistant DeFront via PinMe (IPFS + ENS)
- ✅ **Integration**: Seamless connection between contracts and UI
- ✅ **Security**: Timelock, quorum, and proposal thresholds
- ✅ **Battle-Tested**: OpenZeppelin audited contracts

Everything is decentralized and on-chain - from governance to frontend.

## 🔮 Future Enhancements

- Cross-chain governance support
- Enhanced reputation system
- Mobile app for on-the-go access
- Advanced analytics and reporting

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ for Truth and Decentralization**

