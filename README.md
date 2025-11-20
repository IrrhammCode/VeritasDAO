# VeritasDAO - Decentralized Journalism Platform

> **100% Censorship-Resistant Frontend** - Deployed to IPFS via PinMe

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

### Deployment Steps

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy with PinMe**:
   ```bash
   # Install PinMe CLI (if not already installed)
   npm install -g pinme

   # Deploy to IPFS
   pinme deploy ./dist

   # Link to ENS domain (optional)
   pinme link your-domain.eth
   ```

3. **Access your DeFront**:
   - Via IPFS: `ipfs://<CID>`
   - Via ENS: `your-domain.eth` (if linked)
   - Via IPFS Gateway: `https://ipfs.io/ipfs/<CID>`

### PinMe Configuration

Create a `pinme.config.js` file in the root directory:

```javascript
export default {
  // IPFS configuration
  ipfs: {
    gateway: 'https://ipfs.io',
    pinningService: 'pinata', // or 'infura', 'web3.storage', etc.
  },
  
  // ENS configuration (optional)
  ens: {
    domain: 'veritasdao.eth',
    resolver: '0x...', // Your ENS resolver address
  },
  
  // Build output directory
  buildDir: './dist',
}
```

## 📁 Project Structure

```
veritasdao/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx          # Navigation bar
│   │   ├── Hero.jsx            # Hero section
│   │   ├── Proposals.jsx       # Proposals voting section
│   │   ├── Reports.jsx         # Published reports archive
│   │   ├── SubmitProposal.jsx # Proposal submission form
│   │   └── Network3D.jsx        # 3D background visualization
│   ├── App.jsx                 # Main app component
│   ├── main.jsx               # Entry point
│   └── index.css              # Global styles
├── public/                    # Static assets
├── dist/                      # Build output (for PinMe deployment)
├── package.json
├── vite.config.js
└── README.md
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

