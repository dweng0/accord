# Accord Smart Contracts

Blockchain layer for the Accord decentralized chat system.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Compile Contracts

```bash
npm run build
```

### 3. Run Tests

```bash
npm test
```

## Contract: AccordRegistry

The AccordRegistry contract is the core of Accord's blockchain layer. It stores a mapping of `accordId → ipfsHash` for each registered Accord.

### Key Features

- ✅ Register new Accords (pays fee)
- ✅ Unregister Accords (pays smaller fee)
- ✅ Update metadata (free, owner-only)
- ✅ Transfer ownership
- ✅ Fee management (owner-only)
- ✅ Emergency pause (owner-only)
- ✅ View functions (get accord info, list accords)

### Contract Functions

#### Core Functions

```solidity
// Register a new Accord
function registerAccord(string memory ipfsHash) external payable returns (bytes32 accordId)

// Unregister an Accord
function unregisterAccord(bytes32 accordId) external payable

// Update IPFS metadata hash
function updateMetadata(bytes32 accordId, string memory newIpfsHash) external

// Transfer Accord ownership
function transferAccordOwnership(bytes32 accordId, address newOwner) external
```

#### View Functions

```solidity
// Get Accord details
function getAccord(bytes32 accordId) external view returns (Accord memory)

// Get all Accord IDs
function getAllAccords() external view returns (bytes32[] memory)

// Get only active Accord IDs
function getActiveAccords() external view returns (bytes32[] memory)

// Get total count
function getAccordCount() external view returns (uint256)

// Check if Accord is active
function isAccordActive(bytes32 accordId) external view returns (bool)
```

#### Admin Functions (Owner Only)

```solidity
// Withdraw accumulated fees
function withdrawFees() external

// Update registration fee
function setRegistrationFee(uint256 newFee) external

// Update unregistration fee
function setUnregistrationFee(uint256 newFee) external

// Emergency pause a specific Accord
function emergencyPauseAccord(bytes32 accordId) external
```

## Deployment

### Local Hardhat Network

For persistent local development, use the standalone Hardhat node:

```bash
# Terminal 1: Start Hardhat node (keep running)
npx hardhat node

# Terminal 2: Deploy contract to persistent network
npx hardhat run scripts/deploy.js --network localhost
```

For quick one-off testing without persistence, use the in-memory network:
```bash
# Runs deployment in temporary network that resets after script finishes
npx hardhat run scripts/deploy.js --network hardhat
```

#### Local Development Workflow

1. **Start the persistent node** in one terminal:
   ```bash
   cd packages/contracts && npx hardhat node
   ```
   
   This will show you available accounts and their private keys.

2. **Deploy your contract** in another terminal:
   ```bash
   cd packages/contracts && npx hardhat run scripts/deploy.js --network localhost
   ```

3. **Interact with the deployed contract**:
   ```bash
   # Using the address from deployment output
   node scripts/interact.js <YOUR_DEPLOYED_CONTRACT_ADDRESS>
   ```

4. **Alternative interaction via Hardhat** (recommended):
   ```bash
   npx hardhat run scripts/deploy-and-test.js --network localhost
   ```

#### Node.js Version Warning

⚠️ **Note**: You may see a warning about Node.js version (v21.4.0 not supported). While the code works, consider using Node.js 18 or 20 LTS for official compatibility.

#### Troubleshooting Local Development

- **Connection errors**: Ensure the Hardhat node (`npx hardhat node`) is running before attempting deployment
- **Contract not found**: Verify you're using `--network localhost` when connecting to the persistent node
- **Resetting the network**: Stop the Hardhat node and restart it to reset all state
- **Multiple deployments**: Each restart of the Hardhat node will require redeploying contracts

### Base Sepolia Testnet

1. Get testnet ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)

2. Set environment variables in `.env`:
```bash
PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key
```

3. Deploy:
```bash
npx hardhat run scripts/deploy.js --network baseSepolia
```

4. Verify on Basescan:
```bash
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS>
```

### Base Mainnet

```bash
npx hardhat run scripts/deploy.js --network base
npx hardhat verify --network base <CONTRACT_ADDRESS>
```

## Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test

```bash
npx hardhat test --grep "Register Accord"
```

### Test Coverage

```bash
npx hardhat coverage
```

### Gas Report

```bash
REPORT_GAS=true npm test
```

## Scripts

### Deploy Contract

```bash
npx hardhat run scripts/deploy.js --network <network>
```

### Interact with Contract

```bash
node scripts/interact.js <contract-address>
```

### Register an Accord

```bash
node scripts/register-accord.js <contract-address> <ipfs-hash>
```

Example:
```bash
node scripts/register-accord.js 0x5FbDB2315678afecb367f032d93F642f64180aa3 QmTestHash123
```

## Interactive CLI Testing

Test the blockchain layer using the React Ink CLI:

```bash
# From project root
npm run test:blockchain
```

Features:
- 🚀 Deploy new contract
- 🔌 Connect to existing contract
- 📊 View contract info
- ➕ Register Accord
- 📋 List all Accords
- 🔍 Get Accord details
- ✏️ Update metadata
- ❌ Unregister Accord

## Contract Details

### Fees

| Action | Fee | Purpose |
|--------|-----|---------|
| Register | 0.001 ETH (~$2-5) | Anti-spam, one-time |
| Unregister | 0.0005 ETH (~$1-2) | Prevent spam cycling |
| Update Metadata | Free | Encourage updates |

### Gas Estimates (Base L2)

| Function | Gas | Cost @ 0.1 gwei | Cost @ 1 gwei |
|----------|-----|-----------------|---------------|
| registerAccord | ~150,000 | $0.00015 | $0.0015 |
| unregisterAccord | ~50,000 | $0.00005 | $0.0005 |
| updateMetadata | ~30,000 | $0.00003 | $0.0003 |

### Events

```solidity
event AccordRegistered(bytes32 indexed accordId, address indexed owner, string ipfsHash, uint256 timestamp);
event AccordUnregistered(bytes32 indexed accordId, address indexed owner, uint256 timestamp);
event MetadataUpdated(bytes32 indexed accordId, string newIpfsHash, uint256 timestamp);
event OwnershipTransferred(bytes32 indexed accordId, address indexed previousOwner, address indexed newOwner, uint256 timestamp);
event FeesWithdrawn(address indexed owner, uint256 amount, uint256 timestamp);
event RegistrationFeeUpdated(uint256 oldFee, uint256 newFee);
event UnregistrationFeeUpdated(uint256 oldFee, uint256 newFee);
```

## Test Results

```
  48 passing (825ms)

  ✅ Deployment
  ✅ Register Accord
  ✅ Unregister Accord
  ✅ Update Metadata
  ✅ Transfer Ownership
  ✅ View Functions
  ✅ Admin Functions
  ✅ Emergency Pause
  ✅ Security Tests
```

## Security Features

- ✅ ReentrancyGuard (OpenZeppelin)
- ✅ Ownable (OpenZeppelin)
- ✅ Input validation
- ✅ Access control
- ✅ Refund excess payments
- ✅ Event logging for transparency
- ✅ Emergency pause function

## Networks

### Testnets

- **Base Sepolia**
  - Chain ID: 84532
  - RPC: https://sepolia.base.org
  - Explorer: https://sepolia.basescan.org

### Mainnets

- **Base**
  - Chain ID: 8453
  - RPC: https://mainnet.base.org
  - Explorer: https://basescan.org

## Development

### Project Structure

```
contracts/
├── contracts/
│   └── AccordRegistry.sol      # Main contract
├── test/
│   └── AccordRegistry.test.ts  # Test suite (48 tests)
├── scripts/
│   ├── deploy.js              # Deployment script
│   ├── interact.js            # Interaction script
│   └── register-accord.js     # Register helper
├── hardhat.config.js          # Hardhat configuration
└── package.json               # Dependencies
```

### Adding New Features

1. Update `AccordRegistry.sol`
2. Write tests in `test/AccordRegistry.test.ts`
3. Run `npm test` to verify
4. Update ABI in CLI if needed

## Troubleshooting

### "Insufficient fee" Error

Make sure you're sending the correct registration fee:
```javascript
const fee = await contract.registrationFee();
await contract.registerAccord(ipfsHash, { value: fee });
```

### "Not accord owner" Error

Only the Accord owner can update metadata or unregister. Check:
```javascript
const accord = await contract.getAccord(accordId);
console.log("Owner:", accord.owner);
console.log("Your address:", await signer.getAddress());
```

### Contract Not Found

Ensure you're connected to the correct network:
```bash
npx hardhat run scripts/deploy.js --network localhost
# or
npx hardhat run scripts/deploy.js --network baseSepolia
```

## License

MIT
