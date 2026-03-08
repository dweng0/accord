# Phase 7 Moderation Testing Guide

## Test File Created ✅

Location: `/packages/cli/src/tests/moderation.tsx`

## How to Run the Test

### Option 1: Direct Test (Recommended)
```bash
# From project root
npm run test:moderation
```

### Option 2: Via Main CLI
```bash
# From project root
npm run cli

# Then select "🛡️  Phase 7: Moderation System"
# This will show you the command to run
```

### Option 3: Workspace Command
```bash
npm run test:moderation -w @accord/cli
```

This will launch an interactive CLI with the following menu:

```
MODERATION TEST - Phase 7: Kick, Ban & Admin Management

 🚀 Start Node & Initialize
 ⚡ Kick Peer
 🚫 Ban Peer
 👑 Add Admin
 👤 Remove Admin
 📊 Get Status
 📜 View Moderation Log
 🔍 Check Peer Status
 ❌ Exit
```

## Features You Can Test

### 1. **🚀 Initialize System**
   - Starts a libp2p node
   - Joins an Accord
   - Initializes all moderation components:
     - KickManager
     - BanManager
     - AdminManager
     - ModerationEnforcer

   **Inputs:**
   - Accord ID (e.g., `test-accord`)
   - Owner Address (e.g., `0x1234...`)

### 2. **⚡ Kick Peer** (Temporary Ban)
   - Kick a peer for a specific duration
   - Peer is automatically disconnected if auto-enforce is enabled
   - Kick expires after the duration

   **Inputs:**
   - Peer ID
   - Reason (e.g., "Spamming")
   - Duration in minutes (e.g., `30`)

### 3. **🚫 Ban Peer** (Permanent Ban)
   - Permanently ban a peer from the Accord
   - Peer is automatically disconnected
   - Ban is stored in IPFS (in production)

   **Inputs:**
   - Peer ID
   - Reason (e.g., "Harassment")

### 4. **👑 Add Admin**
   - Grant admin privileges to an address
   - Only owner can add admins
   - Admins can kick and ban peers

   **Inputs:**
   - Address (e.g., `0xabcd...`)
   - Role (e.g., `moderator`)

### 5. **👤 Remove Admin**
   - Remove admin privileges
   - Only owner can remove admins

   **Inputs:**
   - Address to remove

### 6. **📊 Get Status**
   - View complete moderation system status:
     - Active kicks count
     - Total bans count
     - Admin count
     - Owner address
     - Action log entries

   **No inputs required**

### 7. **📜 View Moderation Log**
   - See history of all moderation actions:
     - Kicks
     - Bans
     - Admin additions/removals
   - Shows last 10 actions with timestamps

   **No inputs required**

### 8. **🔍 Check Peer Status**
   - Check if you can moderate a specific peer
   - Shows:
     - Can kick? (Yes/No)
     - Can ban? (Yes/No)
     - Reason if not allowed

   **Inputs:**
   - Peer ID to check

## Example Test Flow

Here's a typical testing scenario:

### Step 1: Initialize
```
1. Select "🚀 Start Node & Initialize"
2. Enter Accord ID: "my-test-accord"
3. Enter Owner Address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1"
4. Wait for initialization...
```

### Step 2: Kick a Peer
```
1. Select "⚡ Kick Peer"
2. Enter Peer ID: "QmTest123..."
3. Enter Reason: "Testing kick functionality"
4. Enter Duration: "5" (5 minutes)
5. View confirmation with expiry time
```

### Step 3: View Status
```
1. Select "📊 Get Status"
2. See active kicks: 1
3. See total bans: 0
4. See admins: 0
5. See logged actions: 1
```

### Step 4: View Log
```
1. Select "📜 View Moderation Log"
2. See recent actions:
   - [12:34:56] Type: kick
   - Peer: QmTest123...
   - Address: 0x1234...
   - Reason: Testing kick functionality
```

## Testing with Multiple Terminals

To fully test the moderation system, run multiple instances:

### Terminal 1 (Admin/Owner):
```bash
npm run test:moderation
# Initialize as owner
# Perform moderation actions
```

### Terminal 2 (Regular Peer):
```bash
npm run test:moderation
# Initialize with same Accord ID
# Try to kick someone (should fail - not admin)
# Get kicked by admin (auto-disconnect)
```

### Terminal 3 (Moderator):
```bash
npm run test:moderation
# Initialize with same Accord ID
# Get promoted to admin by owner
# Kick/ban peers
```

## API Testing

The moderation system exposes these core APIs:

### ModerationEnforcer
```typescript
// Kick a peer
await enforcer.kickPeer(
  targetPeerId: string,
  reason: string,
  duration?: number  // milliseconds
)

// Ban a peer
await enforcer.banPeer(
  targetPeerId: string,
  reason: string
)

// Add admin
await enforcer.addAdmin(
  address: Address,
  role: string
)

// Remove admin
await enforcer.removeAdmin(
  address: Address
)

// Check moderation permissions
enforcer.canModeratePeer(targetPeerId: string): {
  canKick: boolean;
  canBan: boolean;
  reason?: string;
}

// Get status
enforcer.getStatus(): {
  kicks: any;
  bans: any;
  admins: any;
  actionLog: ModerationAction[];
  config: ModerationConfig;
}

// Get action log
enforcer.getModerationLog(): ModerationAction[]
```

### KickManager
```typescript
// Direct kick (if you have permissions)
await kickManager.kickPeer(
  targetPeerId: string,
  reason: string,
  duration?: number,
  signerAccount?: any
)

// Check if peer is kicked
kickManager.isPeerKicked(peerId: string): boolean

// Get kick entry
kickManager.getKickEntry(peerId: string): KickEntry | undefined

// Get remaining time
kickManager.getKickTimeRemaining(peerId: string): number
```

### BanManager
```typescript
// Ban a peer
await banManager.banPeer(
  targetPeerId: string,
  reason: string,
  signerAccount?: any
)

// Check if banned
banManager.isAddressBanned(address: Address): boolean

// Get ban entry
banManager.getBanEntry(address: Address): BanEntry | undefined

// Export to IPFS format
banManager.exportBanList(): BanList
```

### AdminManager
```typescript
// Add admin
await adminManager.addAdmin(
  address: Address,
  role: string,
  signerAccount?: any
)

// Remove admin
await adminManager.removeAdmin(
  address: Address,
  signerAccount?: any
)

// Check permissions
adminManager.isAdmin(address: Address): boolean
adminManager.isOwner(address: Address): boolean
adminManager.isAdminOrOwner(address: Address): boolean

// Get admin info
adminManager.getAdmin(address: Address): AdminEntry | undefined
adminManager.getAllAdmins(): AdminEntry[]
```

## Automated Testing

To test programmatically, you can import and use the components directly:

```typescript
import {
  KickManager,
  BanManager,
  AdminManager,
  ModerationEnforcer,
  // ... other components
} from '@accord/core';

// Your test code here
```

## Configuration

The ModerationEnforcer accepts configuration:

```typescript
const enforcer = new ModerationEnforcer(
  kickManager,
  banManager,
  adminManager,
  connectionManager,
  identityManager,
  {
    autoEnforce: true,      // Auto-disconnect kicked/banned peers
    requireConsensus: false // Require consensus for bans (future)
  }
);
```

## Known Limitations

1. **Wallet Signing**: Currently uses placeholder signatures. In production, you'd sign with a real wallet.
2. **IPFS Updates**: Ban/admin lists aren't automatically uploaded to IPFS yet (Phase 7 feature)
3. **Consensus**: The `requireConsensus` option is not yet implemented
4. **Persistence**: Kicks/bans are ephemeral unless exported to IPFS

## Troubleshooting

### "Must be authenticated to kick peers"
- You need to authenticate with a wallet before moderating
- Make sure you've initialized the system first

### "Only admins and owner can kick peers"
- Your address is not the owner or an admin
- Use the owner address or add yourself as admin first

### "Target peer identity unknown"
- The peer you're trying to moderate hasn't announced their identity
- Wait for the peer to connect and authenticate

### "Cannot moderate the owner"
- The owner cannot be kicked or banned
- This is a security feature

## Next Steps

After testing Phase 7, you can:

1. **Integrate with UI**: Build a React frontend that uses these APIs
2. **Add Wallet Signing**: Integrate with MetaMask/WalletConnect for real signatures
3. **IPFS Persistence**: Implement automatic ban list updates to IPFS
4. **Consensus Voting**: Add multi-admin consensus for bans
5. **Appeal System**: Allow banned users to appeal to admins

## Success Criteria ✅

You've successfully tested Phase 7 if you can:

- [x] Initialize the moderation system
- [x] Kick a peer with a reason and duration
- [x] Ban a peer permanently
- [x] Add and remove admins
- [x] View moderation status and logs
- [x] Check moderation permissions
- [x] See auto-enforcement work (kicked/banned peers disconnect)

---

**Happy Testing! 🎉**

For questions or issues, check the source code:
- Test: `/packages/cli/src/tests/moderation.tsx`
- Core: `/packages/core/src/moderation/`
