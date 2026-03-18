[![Evolution](https://github.com/dweng0/accord/actions/workflows/evolve.yml/badge.svg)](https://github.com/dweng0/accord/actions/workflows/evolve.yml)
# Accord

A fully decentralized Discord-style chat system built on blockchain + IPFS + DHT + WebRTC.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│ BLOCKCHAIN (Base/Polygon)                                    │
│ - Accord registry contract                                   │
│ - One-time registration fee (anti-spam)                      │
│ - Stores: accord_id → ipfsHash                               │
└──────────────────────────────────────────────────────────────┘
                         ↓
                    Query accord
                         ↓
        ┌────────────────┴────────────────┐
        │                                 │
┌───────▼────────┐              ┌─────────▼────────┐
│ IPFS           │              │ DHT (libp2p)     │
│ Static metadata│              │ Peer discovery   │
│ - Name         │              │ - Announce       │
│ - Description  │              │ - Find peers     │
│ - Icon/banner  │              │ - No servers!    │
│ - Rules        │              └─────────┬────────┘
└────────────────┘                        │
                                          ▼
                              ┌───────────────────────┐
                              │   WebRTC Connections  │
                              │   (P2P Data Channels) │
                              └───────────┬───────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
              ┌─────▼─────┐         ┌─────▼─────┐       ┌──────▼──────┐
              │   HOST    │◀────────│  Peer 1   │       │   Peer 2    │
              │ (Peer 0)  │────────▶│           │       │             │
              └─────┬─────┘         └───────────┘       └─────────────┘
                    │
              ┌─────▼─────┐
              │  Peer 3   │
              └───────────┘
```

## How It Works

### 1. Accord Registration (One-time, ~$0.01-1)

Accord owner creates their community:

```solidity
registerAccord(ipfsHash) payable
// ipfsHash points to metadata (name, icon, description)
// Returns: accordId (unique hash)
```

**What gets stored on blockchain:**
- Accord ID (unique identifier)
- IPFS hash (static metadata)
- Owner address
- Timestamp

**What does NOT get stored:**
- Messages (too expensive)
- User list (dynamic)
- Server endpoints (fully P2P via DHT)

### 2. Client Discovery

User enters accord address: `0x000...`

```javascript
// 1. Query blockchain for accord info
const ipfsHash = await contract.getAccord("0x000...")

// 2. Fetch static metadata from IPFS
const metadata = await ipfs.cat(ipfsHash)
// {
//   name: "Cool Accord",
//   description: "A chill place to hang out",
//   icon: "ipfs://Qm...",
//   banner: "ipfs://Qm...",
//   rules: ["Be respectful", "No spam"],
//   category: "gaming"
// }

// 3. Display to user: "Cool Accord" [icon] "Join?"
```

### 3. Peer Discovery (DHT)

Client joins the accord using BitTorrent-style DHT:

```javascript
// 4. Announce to DHT: "I'm in accord 0x000..."
await libp2p.pubsub.subscribe(`/accord/0x000...`)
await libp2p.contentRouting.provide(accordId)

// 5. Find other peers in this accord
const peers = await libp2p.contentRouting.findProviders(accordId)

// 6. Determine role:
if (peers.length === 0) {
  // You're the first! You're now the HOST
  becomeHost()
} else {
  // Connect to existing host via WebRTC
  connectToHost(peers[0])
}
```

### 4. WebRTC Connection (Star Topology)

To prevent bandwidth bottleneck, one peer acts as **HOST**:

```
        ┌─────────┐
        │  HOST   │  ← Relays all messages
        └────┬────┘
       ┌─────┼─────┐
       │     │     │
    Peer1  Peer2  Peer3
```

**Host responsibilities:**
- Relay messages to all peers
- Track who's online
- Manage channels/state

**Non-host peers:**
- Send messages only to host
- Receive broadcasts from host
- Uses 1/Nth the bandwidth of full mesh

**Host migration:**
- If host leaves, second-oldest peer becomes new host
- All peers reconnect to new host

### 5. Direct Messages (DMs)

DMs bypass the host - direct P2P connection:

```javascript
// Alice wants to DM Bob
// 1. Alice finds Bob's peer ID from accord
// 2. Alice establishes direct WebRTC connection to Bob
// 3. Messages flow P2P (not through host)
```

No bandwidth cost to host, fully private.

---

## Three-Layer Architecture

| Layer | Purpose | Technology | Cost | Mutability | Centralized? |
|-------|---------|------------|------|------------|--------------|
| **Blockchain** | Accord registry | Base/Polygon | ~$0.01/accord | Immutable | No |
| **IPFS** | Static metadata | IPFS + Pinata | Free | Immutable | No |
| **DHT** | Peer discovery | libp2p DHT | Free | Dynamic | No |
| **WebRTC** | Real-time chat | P2P data channels | Free | Ephemeral | No (P2P) |

---

## Benefits

- ✅ **Fully decentralized**: No servers required (except IPFS pinning)
- ✅ **Censorship-resistant**: Can't shut down DHT or blockchain
- ✅ **Cheap**: Pennies to create, free to use
- ✅ **Scalable**: DHT handles millions of accords
- ✅ **Private**: WebRTC encrypts all data
- ✅ **Bandwidth-efficient**: Host topology (not full mesh)

## Trade-offs

- ⚠️ **Discovery time**: DHT takes 5-30 seconds (vs instant WebSocket)
- ⚠️ **No persistence**: Messages lost when everyone leaves (future: IPFS message log)
- ⚠️ **Host dependency**: If host leaves, brief reconnection needed
- ⚠️ **Complex**: More moving parts than traditional client-server

---

## Phases

### Phase 1: Basic Accord (Text Chat)
- ✅ Blockchain registry contract
- ✅ IPFS metadata storage
- ✅ DHT peer discovery (libp2p)
- ✅ WebRTC data channels (star topology with host)
- ✅ Basic text chat in channels
- ❌ Message persistence (ephemeral only)
- ❌ DMs (Phase 2)

### Phase 2: Enhanced Features
- Direct messages (P2P WebRTC)
- User authentication (wallet signatures)
- Message history (IPFS log)
- Reactions, embeds, rich text
- File sharing (IPFS + WebRTC)

### Phase 3: Voice/Video
- Voice channels (WebRTC audio)
- Video calls (WebRTC video)
- Screen sharing
- SFU for large voice channels

### Phase 4: Advanced
- End-to-end encryption (Signal protocol)
- Moderation tools (token-gated roles)
- Bots/webhooks
- Custom themes

---

## Technology Stack

**Blockchain:**
- **Base** or **Polygon** (cheap EVM L2)
- **Hardhat** for development/testing
- **ethers.js** or **viem** for client interaction

**IPFS:**
- **Pinata** or **Web3.Storage** for pinning
- **ipfs-http-client** or **Helia** for uploads/fetches

**DHT & P2P:**
- **libp2p** (peer discovery, pubsub, DHT)
- **js-libp2p** for browser
- **rust-libp2p** for native clients (optional)

**WebRTC:**
- Native **WebRTC API** (browser built-in)
- **simple-peer** or **peerjs** (wrapper libraries)
- **STUN servers**: Google's public STUN (free)
- **TURN servers**: coturn (self-hosted, only if needed)

**Client:**
- **React** + **TypeScript**
- **wagmi** + **viem** (web3 hooks)
- **Tailwind CSS** (styling)
- **Zustand** or **Jotai** (state management)

**Optional (Future):**
- **Electron** or **Tauri** (desktop app)
- **PostgreSQL** (if adding centralized features)
- **Redis** (caching, presence)

---

## Pseudo-code for Components

### 1. Smart Contract (Solidity)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AccordRegistry {
    struct Accord {
        address owner;
        string ipfsHash;      // Static metadata
        uint256 createdAt;
    }

    mapping(bytes32 => Accord) public accords;
    bytes32[] public accordIds;

    uint256 public registrationFee = 0.001 ether;

    event AccordRegistered(bytes32 indexed accordId, address owner, string ipfsHash);
    event MetadataUpdated(bytes32 indexed accordId, string newIpfsHash);

    function registerAccord(string memory ipfsHash) external payable returns (bytes32) {
        require(msg.value >= registrationFee, "Insufficient fee");

        bytes32 accordId = keccak256(abi.encodePacked(msg.sender, block.timestamp));

        accords[accordId] = Accord({
            owner: msg.sender,
            ipfsHash: ipfsHash,
            createdAt: block.timestamp
        });

        accordIds.push(accordId);

        emit AccordRegistered(accordId, msg.sender, ipfsHash);
        return accordId;
    }

    function updateMetadata(bytes32 accordId, string memory newIpfsHash) external {
        require(accords[accordId].owner == msg.sender, "Not owner");
        accords[accordId].ipfsHash = newIpfsHash;
        emit MetadataUpdated(accordId, newIpfsHash);
    }

    function getAccord(bytes32 accordId) external view returns (Accord memory) {
        return accords[accordId];
    }

    function getAllAccords() external view returns (bytes32[] memory) {
        return accordIds;
    }

    function withdraw() external {
        // Owner can withdraw fees (for infrastructure costs)
        payable(owner()).transfer(address(this).balance);
    }
}
```

---

### 2. IPFS Metadata Uploader

```javascript
// upload-metadata.js
import { create } from 'ipfs-http-client';
import fs from 'fs';

const ipfs = create({ url: 'https://ipfs.infura.io:5001' });
// Or use Pinata, Web3.Storage, etc.

async function uploadAccordMetadata(metadata) {
  // metadata = {
  //   name: "Cool Accord",
  //   description: "A chill community",
  //   icon: "ipfs://Qm...icon.png",
  //   banner: "ipfs://Qm...banner.jpg",
  //   category: "gaming",
  //   rules: ["Be respectful", "No spam"],
  //   version: "1.0"
  // }

  const { cid } = await ipfs.add(JSON.stringify(metadata));
  console.log(`Metadata uploaded: ${cid}`);
  return cid.toString(); // "Qm..."
}

async function uploadImage(filePath) {
  const file = fs.readFileSync(filePath);
  const { cid } = await ipfs.add(file);
  return `ipfs://${cid}`;
}

// Usage:
const iconCid = await uploadImage('./icon.png');
const bannerCid = await uploadImage('./banner.jpg');

const metadata = {
  name: "My Accord",
  description: "Welcome!",
  icon: iconCid,
  banner: bannerCid,
  category: "general",
  rules: ["Be nice"]
};

const ipfsHash = await uploadAccordMetadata(metadata);
// Now register on blockchain with this ipfsHash
```

---

### 3. Client: Accord Discovery

```typescript
// accord-discovery.ts
import { ethers } from 'ethers';
import { create } from 'ipfs-http-client';

const CONTRACT_ADDRESS = '0x...';
const CONTRACT_ABI = [...];

interface AccordMetadata {
  name: string;
  description: string;
  icon: string;
  banner: string;
  category: string;
  rules: string[];
}

class AccordDiscovery {
  private contract: ethers.Contract;
  private ipfs: any;

  constructor(provider: ethers.providers.Provider) {
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    this.ipfs = create({ url: 'https://ipfs.io' });
  }

  async getAccordInfo(accordId: string): Promise<AccordMetadata> {
    // 1. Query blockchain
    const accord = await this.contract.getAccord(accordId);
    const ipfsHash = accord.ipfsHash;

    // 2. Fetch from IPFS
    const chunks = [];
    for await (const chunk of this.ipfs.cat(ipfsHash)) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks).toString();

    return JSON.parse(data);
  }

  async listAllAccords(): Promise<string[]> {
    return await this.contract.getAllAccords();
  }

  async registerNewAccord(ipfsHash: string, signer: ethers.Signer): Promise<string> {
    const contractWithSigner = this.contract.connect(signer);
    const tx = await contractWithSigner.registerAccord(ipfsHash, {
      value: ethers.utils.parseEther('0.001')
    });
    const receipt = await tx.wait();

    // Extract accordId from event
    const event = receipt.events?.find(e => e.event === 'AccordRegistered');
    return event?.args?.accordId;
  }
}

// Usage:
const provider = new ethers.providers.Web3Provider(window.ethereum);
const discovery = new AccordDiscovery(provider);

const accordId = '0x000...';
const metadata = await discovery.getAccordInfo(accordId);
console.log(metadata.name); // "Cool Accord"
```

---

### 4. Client: DHT Peer Discovery (libp2p)

```typescript
// peer-discovery.ts
import { createLibp2p } from 'libp2p';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@chainsafe/libp2p-noise';
import { mplex } from '@libp2p/mplex';
import { kadDHT } from '@libp2p/kad-dht';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';

interface PeerInfo {
  peerId: string;
  multiaddrs: string[];
  joinedAt: number;
}

class AccordPeerDiscovery {
  private libp2p: any;
  private accordId: string;
  private topic: string;

  async init() {
    this.libp2p = await createLibp2p({
      transports: [webSockets()],
      connectionEncryption: [noise()],
      streamMuxers: [mplex()],
      dht: kadDHT(),
      pubsub: gossipsub()
    });

    await this.libp2p.start();
    console.log('libp2p started:', this.libp2p.peerId.toString());
  }

  async joinAccord(accordId: string): Promise<PeerInfo[]> {
    this.accordId = accordId;
    this.topic = `/accord/${accordId}`;

    // Subscribe to pubsub topic
    await this.libp2p.pubsub.subscribe(this.topic);

    // Announce presence to DHT
    const key = new TextEncoder().encode(`accord:${accordId}`);
    await this.libp2p.contentRouting.provide(key);

    // Find other peers
    const providers = await this.libp2p.contentRouting.findProviders(key, {
      timeout: 30000 // 30 seconds
    });

    const peers: PeerInfo[] = [];
    for await (const provider of providers) {
      if (provider.id.toString() !== this.libp2p.peerId.toString()) {
        peers.push({
          peerId: provider.id.toString(),
          multiaddrs: provider.multiaddrs.map(m => m.toString()),
          joinedAt: Date.now()
        });
      }
    }

    return peers;
  }

  async announcePresence(metadata: any) {
    await this.libp2p.pubsub.publish(
      this.topic,
      new TextEncoder().encode(JSON.stringify({
        type: 'presence',
        peerId: this.libp2p.peerId.toString(),
        metadata,
        timestamp: Date.now()
      }))
    );
  }

  onPeerJoin(callback: (peer: PeerInfo) => void) {
    this.libp2p.pubsub.addEventListener('message', (evt) => {
      if (evt.detail.topic === this.topic) {
        const msg = JSON.parse(new TextDecoder().decode(evt.detail.data));
        if (msg.type === 'presence') {
          callback({
            peerId: msg.peerId,
            multiaddrs: [],
            joinedAt: msg.timestamp
          });
        }
      }
    });
  }
}

// Usage:
const discovery = new AccordPeerDiscovery();
await discovery.init();

const peers = await discovery.joinAccord('0x000...');
console.log(`Found ${peers.length} peers`);

discovery.onPeerJoin((peer) => {
  console.log('New peer joined:', peer.peerId);
  // Connect via WebRTC
});
```

---

### 5. Client: WebRTC Host (Star Topology)

```typescript
// webrtc-host.ts
import SimplePeer from 'simple-peer';

interface Message {
  type: string;
  from: string;
  data: any;
  timestamp: number;
}

class AccordHost {
  private peers: Map<string, SimplePeer.Instance> = new Map();
  private isHost: boolean = false;
  private hostConnection?: SimplePeer.Instance;

  // Become the host
  becomeHost() {
    this.isHost = true;
    console.log('You are now the HOST');
  }

  // Connect to existing host
  connectToHost(hostPeerId: string, initiator: boolean = true) {
    this.isHost = false;

    const peer = new SimplePeer({
      initiator,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on('signal', (data) => {
      // Send signal data via DHT pubsub
      this.sendSignalViaLibp2p(hostPeerId, data);
    });

    peer.on('connect', () => {
      console.log('Connected to host!');
      this.hostConnection = peer;
    });

    peer.on('data', (data) => {
      this.handleMessageFromHost(data);
    });

    peer.on('error', (err) => {
      console.error('WebRTC error:', err);
    });

    return peer;
  }

  // Host accepts new peer connection
  acceptPeer(peerId: string, initiator: boolean = false) {
    if (!this.isHost) return;

    const peer = new SimplePeer({
      initiator,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      }
    });

    peer.on('signal', (data) => {
      this.sendSignalViaLibp2p(peerId, data);
    });

    peer.on('connect', () => {
      console.log(`Peer ${peerId} connected`);
      this.peers.set(peerId, peer);
      this.broadcastPeerList();
    });

    peer.on('data', (data) => {
      // Relay message to all other peers
      this.relayMessage(peerId, data);
    });

    peer.on('close', () => {
      this.peers.delete(peerId);
      this.broadcastPeerList();
    });

    return peer;
  }

  // Host relays message to all peers
  relayMessage(fromPeerId: string, data: Buffer) {
    const message: Message = JSON.parse(data.toString());

    // Broadcast to all peers except sender
    for (const [peerId, peer] of this.peers.entries()) {
      if (peerId !== fromPeerId) {
        peer.send(data);
      }
    }
  }

  // Non-host sends message to host
  sendMessage(message: any) {
    if (this.isHost) {
      // You're the host, broadcast to all
      this.broadcast(message);
    } else {
      // Send to host, who will relay
      this.hostConnection?.send(JSON.stringify(message));
    }
  }

  // Host broadcasts to all peers
  broadcast(message: any) {
    if (!this.isHost) return;

    const data = JSON.stringify(message);
    for (const peer of this.peers.values()) {
      peer.send(data);
    }
  }

  broadcastPeerList() {
    this.broadcast({
      type: 'peerList',
      peers: Array.from(this.peers.keys())
    });
  }

  handleMessageFromHost(data: Buffer) {
    const message = JSON.parse(data.toString());

    switch (message.type) {
      case 'chat':
        console.log(`${message.from}: ${message.text}`);
        break;
      case 'peerList':
        console.log('Online peers:', message.peers);
        break;
      default:
        console.log('Unknown message:', message);
    }
  }

  // Helper to send WebRTC signals via libp2p
  private sendSignalViaLibp2p(targetPeerId: string, signalData: any) {
    // This would use the libp2p pubsub to exchange WebRTC signals
    // Implementation depends on your libp2p setup
    console.log('Send signal to', targetPeerId, signalData);
  }

  // Host migration when current host leaves
  migrateHost(newHostPeerId: string) {
    if (!this.isHost) return;

    console.log(`Migrating host to ${newHostPeerId}`);

    // Notify all peers of new host
    this.broadcast({
      type: 'hostMigration',
      newHost: newHostPeerId
    });

    // Close all connections
    for (const peer of this.peers.values()) {
      peer.destroy();
    }

    this.isHost = false;
    this.peers.clear();
  }
}

// Usage:
const host = new AccordHost();

// Scenario 1: You're the first (become host)
host.becomeHost();

// Scenario 2: Connect to existing host
const peers = await discovery.joinAccord('0x000...');
if (peers.length > 0) {
  host.connectToHost(peers[0].peerId);
} else {
  host.becomeHost();
}

// Send a message
host.sendMessage({
  type: 'chat',
  from: myWalletAddress,
  text: 'Hello Accord!',
  timestamp: Date.now()
});
```

---

### 6. Client: Direct Messages (P2P)

```typescript
// direct-messages.ts
import SimplePeer from 'simple-peer';

class DirectMessageManager {
  private dmConnections: Map<string, SimplePeer.Instance> = new Map();

  // Initiate DM with another user
  async startDM(targetPeerId: string): Promise<void> {
    // Don't go through host - direct connection
    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      }
    });

    peer.on('signal', (data) => {
      // Send signal via libp2p pubsub directly to target
      this.sendDMSignal(targetPeerId, data);
    });

    peer.on('connect', () => {
      console.log(`DM connection established with ${targetPeerId}`);
      this.dmConnections.set(targetPeerId, peer);
    });

    peer.on('data', (data) => {
      const message = JSON.parse(data.toString());
      console.log(`DM from ${targetPeerId}:`, message.text);
      // Emit event for UI to handle
    });

    peer.on('close', () => {
      this.dmConnections.delete(targetPeerId);
    });
  }

  // Accept incoming DM request
  acceptDM(fromPeerId: string, signalData: any) {
    const peer = new SimplePeer({
      initiator: false,
      trickle: false
    });

    peer.on('signal', (data) => {
      this.sendDMSignal(fromPeerId, data);
    });

    peer.on('connect', () => {
      console.log(`DM connection accepted from ${fromPeerId}`);
      this.dmConnections.set(fromPeerId, peer);
    });

    peer.on('data', (data) => {
      const message = JSON.parse(data.toString());
      console.log(`DM from ${fromPeerId}:`, message.text);
    });

    peer.signal(signalData);
  }

  // Send DM
  sendDM(targetPeerId: string, text: string) {
    const connection = this.dmConnections.get(targetPeerId);
    if (!connection) {
      console.error('No DM connection with', targetPeerId);
      return;
    }

    connection.send(JSON.stringify({
      type: 'dm',
      text,
      timestamp: Date.now()
    }));
  }

  private sendDMSignal(targetPeerId: string, signalData: any) {
    // Send via libp2p pubsub on DM-specific topic
    const topic = `/accord/dm/${targetPeerId}`;
    // Implementation depends on libp2p setup
  }
}

// Usage:
const dmManager = new DirectMessageManager();

// User clicks "DM" button
await dmManager.startDM('QmPeer123...');

// Send a private message
dmManager.sendDM('QmPeer123...', 'Hey, this is private!');
```

---

### 7. Full Client Integration Example

```typescript
// accord-client.ts
import { AccordDiscovery } from './accord-discovery';
import { AccordPeerDiscovery } from './peer-discovery';
import { AccordHost } from './webrtc-host';
import { DirectMessageManager } from './direct-messages';
import { ethers } from 'ethers';

class AccordClient {
  private discovery: AccordDiscovery;
  private peerDiscovery: AccordPeerDiscovery;
  private host: AccordHost;
  private dmManager: DirectMessageManager;

  async init() {
    // Connect wallet
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send('eth_requestAccounts', []);

    // Initialize components
    this.discovery = new AccordDiscovery(provider);
    this.peerDiscovery = new AccordPeerDiscovery();
    await this.peerDiscovery.init();

    this.host = new AccordHost();
    this.dmManager = new DirectMessageManager();
  }

  async joinAccord(accordId: string) {
    // 1. Get accord metadata
    const metadata = await this.discovery.getAccordInfo(accordId);
    console.log(`Joining: ${metadata.name}`);

    // 2. Find peers via DHT
    const peers = await this.peerDiscovery.joinAccord(accordId);
    console.log(`Found ${peers.length} peers`);

    // 3. Connect via WebRTC
    if (peers.length === 0) {
      // First person - become host
      this.host.becomeHost();
    } else {
      // Connect to existing host (first peer)
      this.host.connectToHost(peers[0].peerId);
    }

    // 4. Announce presence
    await this.peerDiscovery.announcePresence({
      wallet: await this.getWalletAddress()
    });
  }

  sendMessage(text: string) {
    this.host.sendMessage({
      type: 'chat',
      from: await this.getWalletAddress(),
      text,
      timestamp: Date.now()
    });
  }

  startDM(targetPeerId: string) {
    this.dmManager.startDM(targetPeerId);
  }

  async getWalletAddress(): Promise<string> {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    return await signer.getAddress();
  }
}

// Usage:
const client = new AccordClient();
await client.init();

await client.joinAccord('0x000...');
client.sendMessage('Hello everyone!');
```

---

## Development Roadmap

### Sprint 1: Core Infrastructure (2-3 weeks)
- [ ] Smart contract development + testing
- [ ] Deploy to testnet (Base Sepolia)
- [ ] IPFS metadata upload/fetch utilities
- [ ] Basic React UI scaffold

### Sprint 2: P2P Networking (2-3 weeks)
- [ ] libp2p integration (DHT, pubsub)
- [ ] Peer discovery implementation
- [ ] WebRTC star topology (host model)
- [ ] Basic text chat functionality

### Sprint 3: User Experience (2 weeks)
- [ ] Wallet connection (wagmi)
- [ ] Accord browser UI
- [ ] Chat interface (channels, messages)
- [ ] User list, presence indicators

### Sprint 4: Polish & Deploy (1-2 weeks)
- [ ] Deploy contract to mainnet
- [ ] Error handling, reconnection logic
- [ ] Host migration implementation
- [ ] Documentation, onboarding

### Sprint 5: DMs & Advanced (2 weeks)
- [ ] Direct message P2P connections
- [ ] File sharing (IPFS + WebRTC)
- [ ] Message reactions, formatting
- [ ] Testing, bug fixes

---

## FAQ

**Q: What if everyone leaves the accord?**
A: Messages are lost (ephemeral). Phase 2 will add optional IPFS message logging.

**Q: Can the blockchain be censored?**
A: No, as long as the blockchain network exists, accords can be registered/discovered.

**Q: What if the host has a bad connection?**
A: Host migration kicks in. Next oldest peer becomes host. In Phase 2, users can vote to elect a new host.

**Q: How much does it cost?**
A: Register accord: ~$0.01-1 (one-time). Join/chat: Free (P2P). IPFS pinning: Free tier (Pinata/Web3.Storage).

**Q: Is it truly decentralized?**
A: Yes! No central servers. Blockchain + IPFS + DHT + WebRTC are all decentralized technologies.

**Q: Can I use this on mobile?**
A: Phase 1 is web-only. Mobile app (React Native) planned for Phase 3+.

---

## License

MIT (or your choice)

## Contributing

TBD

---

**Next Steps:**
1. Set up development environment
2. Deploy smart contract to testnet
3. Build basic UI
4. Implement libp2p peer discovery
5. Test WebRTC connections locally
