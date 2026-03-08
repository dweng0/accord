# Accord Development Guide

## Project Structure

```
accord/
├── packages/
│   ├── contracts/          # Smart contracts (Solidity + Hardhat)
│   ├── core/              # Core business logic (TypeScript)
│   ├── cli/               # React Ink CLI for testing
│   └── web/               # Future: React web client
├── package.json           # Root package (workspaces)
├── tsconfig.json          # Root TypeScript config
└── .env.example           # Environment template
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

This will install all dependencies for the monorepo and all packages.

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- Add your wallet private key (for testnet deployments)
- Add Pinata or Web3.Storage API keys
- Add RPC URLs (or use defaults)

### 3. Build All Packages

```bash
npm run build
```

This compiles TypeScript and Solidity contracts.

## Development Workflow

### Running the CLI

```bash
# Run the interactive menu
npm run cli

# Or run specific test phases
npm run test:blockchain
npm run test:ipfs
npm run test:dht
npm run test:webrtc
npm run test:auth
npm run test:moderation
npm run test:full
```

### Working on Contracts

```bash
cd packages/contracts

# Compile contracts
npm run build

# Run tests
npm test

# Deploy to testnet
npm run deploy:testnet

# Verify contract on Basescan
npm run verify -- --network baseSepolia <CONTRACT_ADDRESS>
```

### Working on Core

```bash
cd packages/core

# Watch mode for development
npm run dev

# Build
npm run build

# Run tests
npm test
```

### Working on CLI

```bash
cd packages/cli

# Run in development mode
npm run dev

# Build
npm run build
```

## Testing Each Phase

### Phase 2: Blockchain Layer

**What it tests:**
- Smart contract deployment
- Accord registration
- Metadata updates
- Fetching accord info

**How to run:**
```bash
npm run test:blockchain
```

### Phase 3: IPFS Layer

**What it tests:**
- Upload metadata to IPFS
- Fetch metadata from IPFS
- Upload images (icon/banner)
- Fetch ban/admin lists

**How to run:**
```bash
npm run test:ipfs
```

### Phase 4: DHT Peer Discovery

**What it tests:**
- libp2p node initialization
- Peer discovery via DHT
- PubSub messaging
- Presence announcements

**How to run:**
```bash
npm run test:dht
```

### Phase 5: WebRTC Connections

**What it tests:**
- Host election
- WebRTC peer connections
- Message relay (star topology)
- Host migration

**How to run:**
```bash
npm run test:webrtc
```

### Phase 6: Authentication

**What it tests:**
- Wallet signature verification
- Multi-peer verification
- Ban list checking
- Admin verification
- Consensus algorithm

**How to run:**
```bash
npm run test:auth
```

### Phase 7: Moderation

**What it tests:**
- Kick users (temporary)
- Ban users (permanent)
- Add/remove admins
- Signature verification for mod actions

**How to run:**
```bash
npm run test:moderation
```

### Phase 8: Full Integration

**What it tests:**
- Complete end-to-end flow
- Join accord
- Send/receive messages
- User presence
- Moderation actions

**How to run:**
```bash
npm run test:full
```

## Architecture Layers

### Layer 1: Blockchain (Base L2)
- **Purpose:** Accord registry
- **Tech:** Solidity, Hardhat, ethers.js
- **Storage:** `accordId → ipfsHash` mapping
- **Cost:** ~$2-5 to register (one-time)

### Layer 2: IPFS
- **Purpose:** Static metadata storage
- **Tech:** Pinata/Web3.Storage
- **Storage:** Metadata JSON, images
- **Cost:** Free (with free tier)

### Layer 3: DHT (libp2p)
- **Purpose:** Peer discovery
- **Tech:** js-libp2p, Kademlia DHT
- **Function:** Find peers in same accord
- **Cost:** Free (P2P)

### Layer 4: WebRTC
- **Purpose:** Real-time chat
- **Tech:** simple-peer, native WebRTC
- **Topology:** Star (host relays messages)
- **Cost:** Free (P2P)

## Key Concepts

### Host Election

1. **Owner Priority:** Accord owner always becomes host (if online)
2. **Admin Priority:** If owner offline, admin becomes host
3. **First Peer:** If no owner/admin, first peer is host

### Verification Process

1. User signs join message with wallet
2. Request sent to 3 random peers (verifiers)
3. Each verifier checks:
   - Signature validity
   - Ban list
   - Admin list
4. Majority vote determines outcome
5. User joins or is rejected

### Moderation

**Kick (Temporary):**
- Duration: 1 hour (auto-expires)
- Storage: In-memory (session only)
- Who: Owner or Admin
- Requires: Signature

**Ban (Permanent):**
- Duration: Until removed from list
- Storage: External URL (GitHub)
- Who: Owner or Admin
- Requires: Signature + list update

**Admin Management:**
- Add/Remove: Owner only
- Verification: Signature-based
- Storage: External URL (GitHub)

## Deployment Checklist

### Testnet (Base Sepolia)

- [ ] Fund wallet with Sepolia ETH
- [ ] Deploy AccordRegistry contract
- [ ] Verify contract on Basescan
- [ ] Test registration flow
- [ ] Test IPFS uploads
- [ ] Test peer discovery
- [ ] Test WebRTC connections

### Mainnet (Base)

- [ ] Audit smart contracts
- [ ] Fund wallet with ETH
- [ ] Deploy to Base mainnet
- [ ] Verify contract
- [ ] Test with real users
- [ ] Set up monitoring
- [ ] Document contract addresses

## Troubleshooting

### libp2p Connection Issues

```bash
# Check if ports are open
netstat -an | grep 4001

# Check libp2p logs
DEBUG=libp2p:* npm run test:dht
```

### IPFS Upload Failures

```bash
# Check API keys
echo $PINATA_API_KEY

# Test connection
curl -H "pinata_api_key: $PINATA_API_KEY" \
     -H "pinata_secret_api_key: $PINATA_SECRET_KEY" \
     https://api.pinata.cloud/data/testAuthentication
```

### Smart Contract Deployment Issues

```bash
# Check wallet balance
npx hardhat run scripts/check-balance.ts --network baseSepolia

# Check gas prices
npx hardhat run scripts/check-gas.ts --network baseSepolia
```

## Resources

- [Hardhat Docs](https://hardhat.org/docs)
- [libp2p Docs](https://docs.libp2p.io/)
- [Pinata Docs](https://docs.pinata.cloud/)
- [WebRTC Docs](https://webrtc.org/getting-started/overview)
- [Base Docs](https://docs.base.org/)

## Next Steps

1. Complete Phase 2: Blockchain implementation
2. Complete Phase 3: IPFS integration
3. Complete Phase 4: DHT peer discovery
4. Complete Phase 5: WebRTC connections
5. Complete Phase 6: Authentication
6. Complete Phase 7: Moderation
7. Complete Phase 8: Full integration
8. Build web client (React)
9. Deploy to production
10. Launch!
