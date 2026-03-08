# Accord - Quick Start Guide

## What is Accord?

Accord is a fully decentralized Discord-style chat system built on:
- **Blockchain** (Base L2) - Accord registry
- **IPFS** - Static metadata storage
- **DHT** (libp2p) - Peer discovery
- **WebRTC** - Real-time P2P chat

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd accord

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

## Running the CLI

The React Ink CLI lets you test each phase in isolation:

```bash
# Run interactive menu
npm run cli
```

You'll see:

```
╔═══════════════════════════════════════════╗
║           ACCORD - TEST CLI               ║
║   Decentralized Chat Testing Suite       ║
╚═══════════════════════════════════════════╝

Select a test phase to run:

❯ 🔗 Phase 2: Blockchain Layer
  📦 Phase 3: IPFS Layer
  🌐 Phase 4: DHT Peer Discovery
  🔌 Phase 5: WebRTC Connections
  🔐 Phase 6: Authentication & Verification
  🛡️  Phase 7: Moderation System
  💬 Phase 8: Full Chat Integration
  ❌ Exit
```

## Testing Individual Phases

```bash
# Test blockchain layer (Phase 2)
npm run test:blockchain

# Test IPFS layer (Phase 3)
npm run test:ipfs

# Test DHT peer discovery (Phase 4)
npm run test:dht

# Test WebRTC connections (Phase 5)
npm run test:webrtc

# Test authentication (Phase 6)
npm run test:auth

# Test moderation (Phase 7)
npm run test:moderation

# Test full integration (Phase 8)
npm run test:full
```

## Development Workflow

### Working on Smart Contracts

```bash
cd packages/contracts

# Compile contracts
npm run build

# Run tests
npm test

# Deploy to local network
npx hardhat node  # In one terminal
npm run deploy:testnet  # In another

# Deploy to Base Sepolia testnet
npm run deploy:testnet
```

### Working on Core Logic

```bash
cd packages/core

# Watch mode
npm run dev

# Build
npm run build
```

### Working on CLI

```bash
cd packages/cli

# Development mode
npm run dev

# Build
npm run build
```

## Project Structure

```
accord/
├── packages/
│   ├── contracts/     # Smart contracts (Solidity + Hardhat)
│   ├── core/          # Business logic (IPFS, DHT, WebRTC)
│   ├── cli/           # React Ink testing CLI
│   └── web/           # Future: React web client
├── package.json       # Root workspace config
└── .env               # Your environment variables
```

## Configuration

Edit `.env` with your settings:

```bash
# Blockchain
PRIVATE_KEY=your_wallet_private_key
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_key

# IPFS
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_KEY=your_pinata_secret
```

## Current Status

✅ **Phase 1: Project Setup** - COMPLETE
- Monorepo structure
- TypeScript configuration
- React Ink CLI skeleton
- All packages scaffolded

⏳ **Phase 2: Blockchain Layer** - NEXT
- AccordRegistry smart contract
- Test suite
- Deployment scripts
- CLI test interface

📅 **Phases 3-8** - Coming Soon

## Key Commands

```bash
# Install
npm install

# Build all packages
npm run build

# Run CLI
npm run cli

# Clean
npm run clean

# Test specific phase
npm run test:<phase>
```

## Documentation

- **README.md** - Project overview
- **DEVELOPMENT.md** - Detailed development guide
- **PROJECT_STATUS.md** - Current progress
- **blockchain-layer.md** - Blockchain design
- **ipfs-layer.md** - IPFS & moderation design

## Getting Help

1. Check `DEVELOPMENT.md` for detailed instructions
2. Check `PROJECT_STATUS.md` for current progress
3. Read design docs (`blockchain-layer.md`, `ipfs-layer.md`)
4. Check package READMEs (coming soon)

## Next Steps

1. ✅ Project setup complete
2. ⏳ Implement Phase 2 (Blockchain)
3. 📅 Implement Phase 3 (IPFS)
4. 📅 Continue through Phase 8
5. 🚀 Deploy to production

## Architecture Quick Reference

### How It Works

1. **Register Accord** (Blockchain)
   - Owner pays ~$2-5 fee
   - Contract stores `accordId → ipfsHash`

2. **Discover Accord** (IPFS + Blockchain)
   - Fetch IPFS hash from blockchain
   - Load metadata (name, icon, rules, ban list)

3. **Find Peers** (DHT)
   - Use libp2p to find other users
   - Announce presence to DHT

4. **Connect & Chat** (WebRTC)
   - First/owner becomes host
   - Host relays messages (star topology)
   - P2P encrypted data channels

5. **Moderation**
   - Owner/admins can kick (1hr) or ban (permanent)
   - Signatures verify all mod actions
   - Distributed verification (3 peers vote)

## Tech Stack

- **Blockchain:** Solidity, Hardhat, ethers.js, Base L2
- **IPFS:** Pinata, Web3.Storage
- **P2P:** libp2p, Kademlia DHT, GossipSub
- **WebRTC:** simple-peer, native WebRTC APIs
- **Frontend:** React, Ink (CLI), TypeScript
- **Testing:** Hardhat test, Jest, React Ink

---

Ready to build the decentralized future of chat! 🚀
