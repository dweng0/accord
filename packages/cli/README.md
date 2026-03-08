# Accord CLI - Test Suite

Interactive testing suite for the Accord decentralized chat system.

## Quick Start

```bash
# From project root
npm run cli
```

This will show you a menu to select which phase to test.

## Direct Test Commands

Run tests directly without the menu:

```bash
# Phase 2: Blockchain Layer
npm run test:blockchain

# Phase 3: IPFS Layer
npm run test:ipfs

# Phase 4: DHT Peer Discovery
npm run test:dht

# Phase 5: WebRTC Connections
npm run test:webrtc

# Phase 6: Authentication
npm run test:auth

# Phase 7: Moderation System ⭐
npm run test:moderation

# Phase 8: Full Integration
npm run test:full
```

## Phase 7: Moderation Test

The moderation test provides an interactive API to test:

- **Kick System**: Temporarily remove peers
- **Ban System**: Permanently ban addresses
- **Admin Management**: Add/remove moderators
- **Permission Checks**: Verify moderation rights
- **Action Logging**: Track all moderation actions

### Example Flow

```bash
# 1. Start the test
npm run test:moderation

# 2. Select "🚀 Start Node & Initialize"
#    Enter Accord ID: test-accord
#    Enter Owner Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1

# 3. Select "⚡ Kick Peer"
#    Enter Peer ID: QmTest123
#    Enter Reason: Spamming
#    Enter Duration: 30 (minutes)

# 4. Select "📊 Get Status"
#    View active kicks, bans, admins, etc.

# 5. Select "📜 View Moderation Log"
#    See history of all actions
```

## Menu Options

### 🚀 Start Node & Initialize
- Starts libp2p node
- Joins Accord
- Initializes moderation system

### ⚡ Kick Peer
- Temporary ban with expiration
- Auto-disconnect if enabled

### 🚫 Ban Peer
- Permanent removal
- Stored in ban list

### 👑 Add Admin
- Grant moderation privileges
- Owner only

### 👤 Remove Admin
- Revoke moderation privileges
- Owner only

### 📊 Get Status
- View system state
- Active kicks/bans
- Admin count

### 📜 View Moderation Log
- History of actions
- Timestamps and reasons

### 🔍 Check Peer Status
- Verify moderation permissions
- See who can moderate whom

## Development

```bash
# Run in development mode
npm run dev

# Build
npm run build

# Clean
npm run clean
```

## Architecture

```
packages/cli/
├── src/
│   ├── components/
│   │   ├── App.tsx          # Main menu
│   │   ├── Header.tsx       # CLI header
│   │   └── Footer.tsx       # CLI footer
│   ├── tests/
│   │   ├── blockchain.tsx   # Phase 2 test
│   │   ├── ipfs.tsx         # Phase 3 test
│   │   ├── dht.tsx          # Phase 4 test
│   │   ├── webrtc.tsx       # Phase 5 test
│   │   ├── auth.tsx         # Phase 6 test (TODO)
│   │   ├── moderation.tsx   # Phase 7 test ⭐
│   │   └── full.tsx         # Phase 8 test (TODO)
│   └── index.tsx            # Entry point
└── package.json
```

## Testing with Multiple Peers

To test moderation across multiple peers, run in separate terminals:

**Terminal 1 (Owner/Admin):**
```bash
npm run test:moderation
# Initialize as owner
# Perform moderation actions
```

**Terminal 2 (Target Peer):**
```bash
npm run test:moderation
# Initialize with same Accord ID
# Get kicked/banned by admin
```

**Terminal 3 (Observer):**
```bash
npm run test:moderation
# Initialize with same Accord ID
# Observe moderation actions
```

## Troubleshooting

### "Raw mode is not supported"
This error appears when running in non-interactive environments (CI/CD, some IDEs). Run in a real terminal for full interactivity.

### "Must be authenticated"
You need to initialize the system first before performing moderation actions.

### "Only admins and owner can moderate"
Your address needs admin privileges or to be the owner.

## Next Steps

After testing Phase 7:
1. Test with real wallet signatures (MetaMask integration)
2. Test IPFS persistence for ban lists
3. Test multi-peer consensus voting
4. Build UI frontend using these APIs

## Documentation

See `/PHASE7_TESTING.md` for complete moderation testing guide.

## License

MIT
