# How to Run the Accord CLI

## Quick Start

### 1. Install Dependencies (if not done already)

```bash
npm install
```

### 2. Set Up Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your Pinata API keys
# (See IPFS_SETUP.md for how to get these)
```

### 3. Run the CLI

#### Main Interactive Menu

```bash
npm run cli
```

This shows the main menu where you can select which phase to test.

#### Test Specific Phases

```bash
# Phase 2: Blockchain Layer
npm run test:blockchain

# Phase 3: IPFS Layer
npm run test:ipfs

# (Phases 4-7 coming soon)
```

## Available Tests

### Phase 2: Blockchain Test

**Command:**
```bash
npm run test:blockchain
```

**What it does:**
- Deploy AccordRegistry contract
- Connect to existing contracts
- Register new Accords
- List all Accords
- Get Accord details
- Update metadata
- Unregister Accords

**Prerequisites:**
- Hardhat node running: `npx hardhat node` (in a separate terminal)
- Or connect to deployed testnet contract

**Example workflow:**
1. Start Hardhat node in Terminal 1:
   ```bash
   cd packages/contracts
   npx hardhat node
   ```

2. Deploy contract in Terminal 2:
   ```bash
   cd packages/contracts
   npx hardhat run scripts/deploy.js --network localhost
   ```

   Copy the deployed contract address (e.g., `0x5FbDB...`)

3. Run CLI in Terminal 3:
   ```bash
   npm run test:blockchain
   ```

4. Select "Connect to Existing Contract"

5. Paste the contract address

6. Now you can register Accords, list them, etc!

### Phase 3: IPFS Test

**Command:**
```bash
npm run test:ipfs
```

**What it does:**
- Test Pinata authentication
- Create Accord metadata
- Upload metadata to IPFS
- Fetch metadata from IPFS
- Upload images (icons/banners)
- List pinned files

**Prerequisites:**
- Pinata API keys in `.env`:
  ```bash
  PINATA_API_KEY=your_key_here
  PINATA_SECRET_KEY=your_secret_here
  ```

**Example workflow:**
1. Get Pinata API keys (see `IPFS_SETUP.md`)

2. Add them to `.env`

3. Run CLI:
   ```bash
   npm run test:ipfs
   ```

4. Test authentication first

5. Create metadata:
   - Enter Accord name
   - Enter description
   - Enter category

6. Upload to IPFS

7. Copy the IPFS hash

8. Fetch metadata to verify

## Navigation

### In the CLI:

- **Arrow Keys (↑/↓):** Navigate menu
- **Enter:** Select option
- **Type & Enter:** Submit input
- **Ctrl+C:** Exit/Cancel

## Common Commands

```bash
# Start main CLI menu
npm run cli

# Test blockchain (requires Hardhat node)
npm run test:blockchain

# Test IPFS (requires Pinata keys)
npm run test:ipfs

# Run smart contract tests
cd packages/contracts && npm test

# Deploy contract to local network
cd packages/contracts && npx hardhat run scripts/deploy.js --network localhost

# Start Hardhat node (for testing)
cd packages/contracts && npx hardhat node
```

## Troubleshooting

### "Not connected to Hardhat node"

Make sure Hardhat node is running:
```bash
cd packages/contracts
npx hardhat node
```

### "Pinata authentication failed"

Check your `.env` file has correct API keys:
```bash
cat .env | grep PINATA
```

If keys are missing, see `IPFS_SETUP.md`.

### "Cannot find module"

Rebuild dependencies:
```bash
npm run build
```

### CLI looks weird/broken

Make sure your terminal supports colors and Unicode:
- Use a modern terminal (iTerm2, Windows Terminal, etc.)
- Terminal width should be at least 80 characters

## Example Session

Here's a complete example of testing the full workflow:

**Terminal 1 - Hardhat Node:**
```bash
cd packages/contracts
npx hardhat node
```

**Terminal 2 - Deploy Contract:**
```bash
cd packages/contracts
npx hardhat run scripts/deploy.js --network localhost
# Copy the contract address
```

**Terminal 3 - Test IPFS:**
```bash
npm run test:ipfs
# 1. Test Authentication
# 2. Create Metadata (name: "Test Accord", description: "Testing", category: "general")
# 3. Upload Metadata
# Copy the IPFS hash
```

**Terminal 3 - Test Blockchain:**
```bash
npm run test:blockchain
# 1. Connect to Existing Contract (paste address from Terminal 2)
# 2. Register Accord (paste IPFS hash from previous step)
# 3. List All Accords (you should see your newly registered Accord!)
# 4. Get Accord Details (paste the Accord ID)
```

Congratulations! You've just created a fully decentralized Accord! 🎉

## Tips

1. **Keep terminals organized:**
   - Terminal 1: Hardhat node (long-running)
   - Terminal 2: Scripts/deployment
   - Terminal 3: CLI testing

2. **Save IPFS hashes:**
   - Copy them to a text file
   - You'll need them to register Accords

3. **Save contract addresses:**
   - Save locally deployed addresses
   - Save testnet addresses for later use

4. **Test incrementally:**
   - Test each phase separately
   - Once both work, test the integration

## What's Next?

After testing Phases 2 & 3:

- ✅ You can deploy smart contracts
- ✅ You can upload metadata to IPFS
- ✅ You can register Accords on-chain
- ✅ You can fetch Accord data

**Coming soon:**
- Phase 4: DHT peer discovery
- Phase 5: WebRTC connections
- Phase 6: Authentication
- Phase 7: Moderation

Stay tuned! 🚀
