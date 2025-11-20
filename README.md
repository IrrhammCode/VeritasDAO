# VeritasDAO - Decentralized Journalism Platform

> **100% Censorship-Resistant Frontend** - Deployed to IPFS via PinMe

🌐 **Live Demo**: [https://fb54bu4q.pinit.eth.limo/](https://fb54bu4q.pinit.eth.limo/)

VeritasDAO is the official frontend for a decentralized journalism guild, built to be 100% censorship-resistant by using PinMe to deploy a decentralized frontend (DeFront) to IPFS and ENS.

## 🎯 Mission

Investigative journalism is under threat. Journalists, whistleblowers, and activists who publish sensitive information ("Veritas" - the Truth) are frequently silenced. Centralized hosting providers can be pressured to take down websites, erasing critical reports.

**VeritasDAO** is a decentralized platform for funding, publishing, and permanently archiving vital investigative journalism.

## ✨ Features

- **Proposal Submission**: Reporters can submit proposals to get funding for their next big story
- **DAO Voting**: DAO Members can vote on which proposals to fund
- **Permanent Archive**: The Public can read all published reports, free from the fear that they will one day disappear
- **3D Visualizations**: Beautiful 3D network visualization representing decentralization
- **Modern UI**: Sleek, professional design with dark mode theme

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **3D Graphics**: Three.js + React Three Fiber
- **Animations**: Framer Motion
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

## 📦 Deployment with PinMe

VeritasDAO is designed to be deployed as a **DeFront** (Decentralized Frontend) using PinMe.

### Why PinMe is Critical

A platform dedicated to "Veritas" (Truth) is useless if its own frontend is a single point of failure. By using PinMe, we deploy our entire web application to IPFS and link it via ENS, making our platform:

- **Tamper-Proof**: The UI cannot be hijacked by hackers
- **Censorship-Resistant**: No single entity can shut us down
- **Truly Decentralized**: Security extends to the frontend, not just smart contracts

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

## 🔮 Future Vision

We plan to integrate this frontend with on-chain smart contracts to fully manage the DAO's treasury and voting process, creating a fully autonomous and unstoppable source for truth.

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ for Truth and Decentralization**

