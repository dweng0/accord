# Blockchain Layer - AccordRegistry Contract

## Overview

The blockchain layer serves as a decentralized registry for Accords. Users pay a small fee to register their Accord, and the contract stores a mapping of `accordId → IPFS hash` (which contains the Accord's metadata).

**Key Features:**
- ✅ Register new Accords (with fee)
- ✅ Remove/unregister Accords (with fee)
- ✅ Update metadata (free, owner-only)
- ✅ Protocol fee collection (small % to Accord treasury)
- ✅ Owner can withdraw fees
- ✅ Owner CANNOT delete contract or others' Accords
- ✅ Immutable once deployed (trustless)

---

## Fee Structure

| Action | User Pays | Goes To | Notes |
|--------|-----------|---------|-------|
| **Register Accord** | 0.001 ETH (~$2-5) | Protocol treasury (100%) | One-time, anti-spam |
| **Unregister Accord** | 0.0005 ETH (~$1-2) | Protocol treasury (100%) | Prevents spam cycling |
| **Update Metadata** | Free | Miners/validators (gas only) | Unlimited updates |

**Why fees?**
- Prevents spam/garbage Accords
- Incentivizes quality communities
- Funds protocol infrastructure
- Shows commitment from accord creators

**What fees pay for:**
- IPFS pinning services (metadata hosting)
- DHT bootstrap nodes (peer discovery)
- Future development (mobile apps, features)
- Security audits
- Community grants & documentation

---

## Smart Contract (Solidity)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AccordRegistry
 * @notice Decentralized registry for Accord servers (Discord-like communities)
 * @dev Users pay to register Accords, protocol takes small fee, owners can withdraw
 */
contract AccordRegistry is Ownable, ReentrancyGuard {

    // ============ Structs ============

    struct Accord {
        address owner;           // Accord creator/owner
        string ipfsHash;         // IPFS hash pointing to metadata
        uint256 createdAt;       // Registration timestamp
        bool active;             // false if unregistered
    }

    // ============ State Variables ============

    mapping(bytes32 => Accord) public accords;
    bytes32[] public accordIds;

    uint256 public registrationFee = 0.001 ether;    // Fee to register
    uint256 public unregistrationFee = 0.0005 ether; // Fee to unregister

    // ============ Events ============

    event AccordRegistered(
        bytes32 indexed accordId,
        address indexed owner,
        string ipfsHash,
        uint256 timestamp
    );

    event AccordUnregistered(
        bytes32 indexed accordId,
        address indexed owner,
        uint256 timestamp
    );

    event MetadataUpdated(
        bytes32 indexed accordId,
        string newIpfsHash,
        uint256 timestamp
    );

    event FeesWithdrawn(
        address indexed owner,
        uint256 amount,
        uint256 timestamp
    );

    event RegistrationFeeUpdated(
        uint256 oldFee,
        uint256 newFee
    );

    event UnregistrationFeeUpdated(
        uint256 oldFee,
        uint256 newFee
    );

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {
        // Owner is set via Ownable constructor
    }

    // ============ Core Functions ============

    /**
     * @notice Register a new Accord
     * @param ipfsHash IPFS hash containing Accord metadata (name, icon, etc.)
     * @return accordId Unique identifier for the Accord
     */
    function registerAccord(string memory ipfsHash)
        external
        payable
        returns (bytes32)
    {
        require(msg.value >= registrationFee, "Insufficient registration fee");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");

        // Generate unique ID
        bytes32 accordId = keccak256(
            abi.encodePacked(msg.sender, block.timestamp, block.prevrandao)
        );

        // Ensure ID doesn't already exist (extremely unlikely)
        require(accords[accordId].createdAt == 0, "Accord ID collision");

        // Store Accord
        accords[accordId] = Accord({
            owner: msg.sender,
            ipfsHash: ipfsHash,
            createdAt: block.timestamp,
            active: true
        });

        accordIds.push(accordId);

        emit AccordRegistered(accordId, msg.sender, ipfsHash, block.timestamp);

        // Refund excess payment
        if (msg.value > registrationFee) {
            payable(msg.sender).transfer(msg.value - registrationFee);
        }

        return accordId;
    }

    /**
     * @notice Unregister an Accord (marks as inactive, keeps data for history)
     * @param accordId The Accord to unregister
     */
    function unregisterAccord(bytes32 accordId)
        external
        payable
    {
        Accord storage accord = accords[accordId];

        require(accord.active, "Accord not active");
        require(accord.owner == msg.sender, "Not accord owner");
        require(msg.value >= unregistrationFee, "Insufficient unregistration fee");

        // Mark as inactive
        accord.active = false;

        emit AccordUnregistered(accordId, msg.sender, block.timestamp);

        // Refund excess
        if (msg.value > unregistrationFee) {
            payable(msg.sender).transfer(msg.value - unregistrationFee);
        }
    }

    /**
     * @notice Update Accord metadata (free, owner-only)
     * @param accordId The Accord to update
     * @param newIpfsHash New IPFS hash with updated metadata
     */
    function updateMetadata(bytes32 accordId, string memory newIpfsHash)
        external
    {
        Accord storage accord = accords[accordId];

        require(accord.active, "Accord not active");
        require(accord.owner == msg.sender, "Not accord owner");
        require(bytes(newIpfsHash).length > 0, "IPFS hash cannot be empty");

        accord.ipfsHash = newIpfsHash;

        emit MetadataUpdated(accordId, newIpfsHash, block.timestamp);
    }

    /**
     * @notice Transfer Accord ownership
     * @param accordId The Accord to transfer
     * @param newOwner New owner address
     */
    function transferAccordOwnership(bytes32 accordId, address newOwner)
        external
    {
        Accord storage accord = accords[accordId];

        require(accord.active, "Accord not active");
        require(accord.owner == msg.sender, "Not accord owner");
        require(newOwner != address(0), "Invalid new owner");

        accord.owner = newOwner;
    }

    // ============ View Functions ============

    /**
     * @notice Get Accord info
     * @param accordId The Accord ID
     * @return Accord struct
     */
    function getAccord(bytes32 accordId)
        external
        view
        returns (Accord memory)
    {
        return accords[accordId];
    }

    /**
     * @notice Get all Accord IDs (active and inactive)
     * @return Array of Accord IDs
     */
    function getAllAccords()
        external
        view
        returns (bytes32[] memory)
    {
        return accordIds;
    }

    /**
     * @notice Get only active Accords
     * @return Array of active Accord IDs
     */
    function getActiveAccords()
        external
        view
        returns (bytes32[] memory)
    {
        uint256 activeCount = 0;

        // Count active accords
        for (uint256 i = 0; i < accordIds.length; i++) {
            if (accords[accordIds[i]].active) {
                activeCount++;
            }
        }

        // Build array of active IDs
        bytes32[] memory activeIds = new bytes32[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < accordIds.length; i++) {
            if (accords[accordIds[i]].active) {
                activeIds[index] = accordIds[i];
                index++;
            }
        }

        return activeIds;
    }

    /**
     * @notice Get total number of Accords
     * @return Total count
     */
    function getAccordCount()
        external
        view
        returns (uint256)
    {
        return accordIds.length;
    }

    /**
     * @notice Check if Accord exists and is active
     * @param accordId The Accord ID
     * @return true if active
     */
    function isAccordActive(bytes32 accordId)
        external
        view
        returns (bool)
    {
        return accords[accordId].active;
    }

    // ============ Admin Functions (Owner Only) ============

    /**
     * @notice Withdraw accumulated fees (owner only)
     * @dev Withdraws entire contract balance (all registration/unregistration fees)
     */
    function withdrawFees()
        external
        onlyOwner
        nonReentrant
    {
        uint256 amount = address(this).balance;
        require(amount > 0, "No fees to withdraw");

        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Transfer failed");

        emit FeesWithdrawn(owner(), amount, block.timestamp);
    }

    /**
     * @notice Update registration fee (owner only)
     * @param newFee New fee in wei
     */
    function setRegistrationFee(uint256 newFee)
        external
        onlyOwner
    {
        uint256 oldFee = registrationFee;
        registrationFee = newFee;

        emit RegistrationFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Update unregistration fee (owner only)
     * @param newFee New fee in wei
     */
    function setUnregistrationFee(uint256 newFee)
        external
        onlyOwner
    {
        uint256 oldFee = unregistrationFee;
        unregistrationFee = newFee;

        emit UnregistrationFeeUpdated(oldFee, newFee);
    }

    // ============ Emergency Functions ============

    /**
     * @notice Emergency pause for specific accord (owner only, security measure)
     * @param accordId Accord to pause
     * @dev Does NOT delete data, only marks inactive. Irreversible by design.
     */
    function emergencyPauseAccord(bytes32 accordId)
        external
        onlyOwner
    {
        require(accords[accordId].active, "Already inactive");
        accords[accordId].active = false;
        emit AccordUnregistered(accordId, accords[accordId].owner, block.timestamp);
    }

    // ============ Utility Functions ============

    /**
     * @notice Get contract balance
     */
    function getBalance()
        external
        view
        returns (uint256)
    {
        return address(this).balance;
    }

    /**
     * @notice Prevent accidental ETH sends
     */
    receive() external payable {
        revert("Use registerAccord() or unregisterAccord()");
    }
}
```

---

## Contract Features Breakdown

### 1. **Registration** (`registerAccord`)
- User pays `registrationFee` (default: 0.001 ETH)
- 100% goes to protocol treasury (contract balance)
- Generates unique `accordId` using hash of (sender, timestamp, randomness)
- Stores IPFS hash
- Emits `AccordRegistered` event
- Refunds excess ETH

### 2. **Unregistration** (`unregisterAccord`)
- Owner can remove their Accord
- Pays `unregistrationFee` (default: 0.0005 ETH)
- 100% goes to protocol treasury
- Marks `active = false` (keeps data for history)
- Does NOT delete from storage (immutable record)

### 3. **Update Metadata** (`updateMetadata`)
- **Free** (only gas cost)
- Owner-only
- Updates IPFS hash (e.g., new icon, description)
- Keeps Accord ID the same

### 4. **Owner Functions** (Protocol Owner Only)
- `withdrawFees()`: Withdraw all accumulated fees from contract
- `setRegistrationFee()`: Adjust registration cost (anti-spam, market conditions)
- `setUnregistrationFee()`: Adjust unregistration cost
- `emergencyPauseAccord()`: Emergency stop for malicious Accords (marks inactive)

### 5. **View Functions**
- `getAccord(accordId)`: Get specific Accord info
- `getAllAccords()`: Get all Accord IDs (active + inactive)
- `getActiveAccords()`: Get only active Accord IDs
- `getAccordCount()`: Total number of Accords
- `isAccordActive(accordId)`: Check if Accord is active

---

## Security Features

### ✅ **Protections Implemented**

1. **ReentrancyGuard**: Prevents reentrancy attacks on withdrawals
2. **Ownable**: Only owner can withdraw protocol fees / adjust fees
3. **Input Validation**:
   - IPFS hash cannot be empty
   - Fees must be sufficient
   - Owner checks before updates
4. **Immutability**: Owner CANNOT delete Accords or the contract
5. **Refund Excess**: Prevents accidental overpayment loss
6. **Event Logging**: All actions emit events (transparency)
7. **Emergency Pause**: Can pause malicious Accords (but can't delete)

### ⚠️ **What Protocol Owner CANNOT Do**

- ❌ Delete users' Accords (can only mark inactive via emergency pause)
- ❌ Steal Accord ownership (owners retain control)
- ❌ Delete the contract (immutable once deployed)
- ❌ Modify other users' metadata
- ❌ Prevent access to blockchain data (public forever)

---

## Deployment Plan

### Phase 1: Testnet Deployment
1. **Base Sepolia** (testnet)
2. Deploy with Hardhat
3. Verify on Basescan
4. Test all functions
5. Audit (optional: OpenZeppelin Defender)

### Phase 2: Mainnet Deployment
1. **Base** (mainnet) - cheapest L2
2. Audit smart contract (SolidProof, CertiK, or self-audit)
3. Deploy via Hardhat
4. Verify on Basescan
5. Renounce ownership OR transfer to multisig (future)

### Phase 3: Governance (Future)
- Transfer ownership to DAO/multisig
- Community votes on fees, protocol changes
- Immutable registry, decentralized control

---

## Development Tasks

### Sprint 1: Smart Contract Development

- [ ] **Set up Hardhat project**
  - Install: `npm init -y && npm install --save-dev hardhat`
  - Install OpenZeppelin: `npm install @openzeppelin/contracts`
  - Init Hardhat: `npx hardhat init`

- [ ] **Write AccordRegistry.sol**
  - Copy contract code above
  - Add to `contracts/AccordRegistry.sol`

- [ ] **Write deployment script**
  - Create `scripts/deploy.js`
  - Deploy to local network
  - Deploy to Base Sepolia testnet

- [ ] **Write tests** (using Hardhat/Chai)
  - Test registration
  - Test unregistration
  - Test metadata update
  - Test fee withdrawals
  - Test access control (only owner can withdraw)
  - Test edge cases (empty IPFS hash, insufficient fee)

- [ ] **Deploy to testnet**
  - Get Base Sepolia ETH (faucet)
  - Deploy contract
  - Verify on Basescan

- [ ] **Verify contract on Basescan**
  - Use Hardhat verify plugin
  - Public can read contract code

- [ ] **Document contract address**
  - Add to README
  - Add to frontend config

### Sprint 2: Frontend Integration

- [ ] **Create Web3 utilities**
  - ethers.js or viem
  - Contract ABI export
  - Read functions (getAccord, getAllAccords)
  - Write functions (registerAccord, updateMetadata)

- [ ] **Build registration UI**
  - Form to upload metadata
  - Upload to IPFS
  - Call `registerAccord()` with IPFS hash
  - Display transaction status

- [ ] **Build Accord browser**
  - Fetch all active Accords
  - Display name, icon, description from IPFS
  - Click to join

---

## Gas Estimates (Base L2)

| Function | Estimated Gas | Cost @ 0.1 gwei | Cost @ 1 gwei |
|----------|---------------|-----------------|---------------|
| `registerAccord()` | ~150,000 | $0.00015 | $0.0015 |
| `unregisterAccord()` | ~50,000 | $0.00005 | $0.0005 |
| `updateMetadata()` | ~30,000 | $0.00003 | $0.0003 |
| `getAccord()` (view) | 0 (free) | $0 | $0 |

**Total cost to register Accord on Base:**
- Registration fee: 0.001 ETH (~$2-5)
- Gas cost: ~$0.002
- **Total: ~$2-5** (one-time)

---

## Testing Checklist

### Unit Tests
- [ ] Register accord with valid IPFS hash
- [ ] Register accord with insufficient fee (should fail)
- [ ] Register accord with empty IPFS hash (should fail)
- [ ] Unregister accord by owner
- [ ] Unregister accord by non-owner (should fail)
- [ ] Update metadata by owner
- [ ] Update metadata by non-owner (should fail)
- [ ] Withdraw protocol fees by owner
- [ ] Withdraw protocol fees by non-owner (should fail)
- [ ] Get all accords
- [ ] Get active accords only
- [ ] Set protocol fee percent by owner
- [ ] Set fees by non-owner (should fail)

### Integration Tests
- [ ] Deploy to local network
- [ ] Register multiple accords
- [ ] Fetch accords from contract
- [ ] Fetch metadata from IPFS
- [ ] Connect wallet (MetaMask)
- [ ] Sign transactions

### Security Tests
- [ ] Reentrancy attack prevention
- [ ] Integer overflow/underflow (Solidity 0.8+ protects)
- [ ] Access control (only owner functions)
- [ ] Denial of service (gas limits)

---

## Contract Addresses

### Testnet (Base Sepolia)
- **Contract**: `TBD`
- **Explorer**: [Basescan Sepolia](https://sepolia.basescan.org/)

### Mainnet (Base)
- **Contract**: `TBD`
- **Explorer**: [Basescan](https://basescan.org/)

---

## FAQ

**Q: Can the contract owner delete my Accord?**
A: No. The owner can only pause it in emergencies (e.g., illegal content). Data remains on-chain forever.

**Q: What happens to fees when I register?**
A: 100% goes to Accord protocol treasury to fund infrastructure (IPFS pinning, DHT bootstrap nodes, development, etc.).

**Q: Can I get a refund if I unregister?**
A: No. The unregistration fee is non-refundable (prevents spam register/unregister cycles).

**Q: Can I change the Accord owner?**
A: Yes, via `transferAccordOwnership()` function.

**Q: Why charge for unregistration?**
A: Prevents spam. Also, it marks the accord inactive but keeps data (for history/transparency).

**Q: What if gas prices spike?**
A: Use Base L2 (very cheap gas). Alternatively, wait for lower gas or deploy on Polygon.

---

## Next Steps

1. Set up Hardhat project
2. Write contract tests
3. Deploy to Base Sepolia testnet
4. Build frontend integration
5. Test registration flow end-to-end
6. Deploy to mainnet
