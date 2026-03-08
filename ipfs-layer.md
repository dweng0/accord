# IPFS Layer - Metadata & Moderation

## Overview

The IPFS layer stores **static metadata** for each Accord, including:
- Name, description, icon, banner
- Category, rules
- **Ban list** (moderated users)

**Key concepts:**
- Blockchain stores `accordId → ipfsHash`
- IPFS stores the actual metadata JSON
- Ban list is hosted externally (GitHub, IPFS, or any URL)
- Decentralized verification: multiple peers verify wallet signatures

---

## Metadata Structure

### Base Metadata (`ipfs://Qm...`)

```json
{
  "version": "1.0",
  "name": "Cool Accord",
  "description": "A chill place to hang out and game",
  "icon": "ipfs://QmIcon123...",
  "banner": "ipfs://QmBanner456...",
  "category": "gaming",
  "rules": [
    "Be respectful",
    "No spam",
    "No NSFW content"
  ],
  "banlist": "https://raw.githubusercontent.com/user/accord-bans/main/banlist.json",
  "adminlist": "https://raw.githubusercontent.com/user/accord-admins/main/adminlist.json",
  "createdAt": 1704672000,
  "links": {
    "website": "https://coolaccord.com",
    "twitter": "https://twitter.com/coolaccord",
    "discord": "https://discord.gg/coolaccord"
  }
}
```

### Ban List (`banlist.json`)

Hosted externally (GitHub, IPFS, or any public URL):

```json
{
  "version": "1.0",
  "bans": [
    {
      "address": "0xAbC123...",
      "reason": "Spam",
      "bannedAt": 1704672000,
      "bannedBy": "0xOwner456...",
      "signature": "0x1234..."
    },
    {
      "address": "0xDeF789...",
      "reason": "Harassment",
      "bannedAt": 1704680000,
      "bannedBy": "0xAdmin789...",
      "signature": "0x5678..."
    }
  ]
}
```

### Admin List (`adminlist.json`)

Hosted externally (GitHub, IPFS, or any public URL):

```json
{
  "version": "1.0",
  "admins": [
    {
      "address": "0xAdmin789...",
      "addedAt": 1704672000,
      "addedBy": "0xOwner456...",
      "signature": "0xabcd...",
      "role": "moderator"
    },
    {
      "address": "0xAdmin999...",
      "addedAt": 1704675000,
      "addedBy": "0xOwner456...",
      "signature": "0xef01...",
      "role": "moderator"
    }
  ]
}
```

**Admin signature verification:**
```javascript
// Owner signs admin addition to prove authenticity
const adminMessage = `Add admin ${address} to ${accordId}\nRole: moderator\nTimestamp: ${timestamp}`;
const signature = await wallet.signMessage(adminMessage);
```

**Why external?**
- IPFS is immutable - can't update lists without changing hash
- External URL (GitHub, etc.) allows dynamic updates
- Owner controls lists via their own infrastructure
- Keeps blockchain costs low

---

## Authentication & Verification Flow

### Step 1: User Wants to Join Accord

```javascript
// User clicks "Join" on "Cool Accord"
const accordId = "0x000..."

// 1. Fetch metadata from blockchain
const accord = await contract.getAccord(accordId)
const metadata = await fetchIPFS(accord.ipfsHash)

// 2. User signs authentication message
const message = `Join Accord: ${accordId}\nTimestamp: ${Date.now()}`
const signature = await wallet.signMessage(message)

// 3. Derive address from signature (client-side verification)
const userAddress = ethers.utils.verifyMessage(message, signature)

// 4. Connect to DHT, find peers
const peers = await libp2p.contentRouting.findProviders(accordId)
```

### Step 2: Verification by Peers

When a new user attempts to join, their signature is sent to **up to 3 random peers** (or all peers if < 3):

```javascript
// New user sends to host/peers:
{
  type: 'join_request',
  accordId: '0x000...',
  address: '0xUser123...',
  signature: '0xSig...',
  message: 'Join Accord: 0x000...\nTimestamp: 1704672000',
  timestamp: 1704672000
}
```

**Verifiers (up to 3 peers) do the following:**

```javascript
// peer-verification.ts
import { ethers } from 'ethers';

async function verifyJoinRequest(request, metadata, accordOwner) {
  // 1. Verify signature matches claimed address
  const recoveredAddress = ethers.utils.verifyMessage(
    request.message,
    request.signature
  );

  if (recoveredAddress.toLowerCase() !== request.address.toLowerCase()) {
    return {
      verified: false,
      isBanned: false,
      isAdmin: false,
      reason: 'Invalid signature'
    };
  }

  // 2. Fetch ban list and admin list from metadata
  const [banlist, adminlist] = await Promise.all([
    fetch(metadata.banlist).then(r => r.json()).catch(() => ({ bans: [] })),
    fetch(metadata.adminlist).then(r => r.json()).catch(() => ({ admins: [] }))
  ]);

  // 3. Check if address is the owner
  const isOwner = recoveredAddress.toLowerCase() === accordOwner.toLowerCase();

  // 4. Check if address is an admin
  const adminEntry = adminlist.admins.find(
    a => a.address.toLowerCase() === recoveredAddress.toLowerCase()
  );

  let isAdmin = isOwner; // Owner is always admin

  if (adminEntry) {
    // Verify admin signature
    const adminMessage = `Add admin ${adminEntry.address} to ${request.accordId}\nRole: ${adminEntry.role}\nTimestamp: ${adminEntry.addedAt}`;
    const adminSigner = ethers.utils.verifyMessage(adminMessage, adminEntry.signature);

    // Ensure admin was added by accord owner
    if (adminSigner.toLowerCase() === accordOwner.toLowerCase()) {
      isAdmin = true;
    } else {
      console.warn('Invalid admin signature, ignoring admin status');
    }
  }

  // 5. Check if address is banned
  const ban = banlist.bans.find(
    b => b.address.toLowerCase() === recoveredAddress.toLowerCase()
  );

  if (ban) {
    // Verify ban signature
    const banMessage = `Ban ${ban.address} from ${request.accordId}\nReason: ${ban.reason}\nTimestamp: ${ban.bannedAt}`;
    const banSigner = ethers.utils.verifyMessage(banMessage, ban.signature);

    // Ensure ban was signed by owner or admin
    const bannedByOwner = banSigner.toLowerCase() === accordOwner.toLowerCase();
    const bannedByAdmin = adminlist.admins.some(
      a => a.address.toLowerCase() === banSigner.toLowerCase()
    );

    if (bannedByOwner || bannedByAdmin) {
      return {
        verified: true,
        isBanned: true,
        isAdmin: false, // Banned users can't be admin
        reason: ban.reason,
        bannedAt: ban.bannedAt
      };
    } else {
      console.warn('Invalid ban signature, ignoring ban');
    }
  }

  // 6. All checks passed
  return {
    verified: true,
    isBanned: false,
    isAdmin,
    reason: null
  };
}
```

### Step 3: Consensus & Admission

```javascript
// Host collects verification results from 3 peers
const verifications = [
  { peerId: 'peer1', verified: true, isBanned: false, isAdmin: false },
  { peerId: 'peer2', verified: true, isBanned: false, isAdmin: false },
  { peerId: 'peer3', verified: true, isBanned: false, isAdmin: true }
];

// Majority vote for each attribute
function getMajorityConsensus(verifications, attribute) {
  const votes = verifications.map(v => v[attribute]);
  const trueVotes = votes.filter(v => v === true).length;
  const falseVotes = votes.filter(v => v === false).length;
  return trueVotes > falseVotes; // Majority wins
}

const verified = getMajorityConsensus(verifications, 'verified');
const isBanned = getMajorityConsensus(verifications, 'isBanned');
const isAdmin = getMajorityConsensus(verifications, 'isAdmin');

if (!verified || isBanned) {
  // Deny entry
  rejectPeer(request.address, isBanned ? 'Banned from this Accord' : 'Verification failed');
} else {
  // Allow user to join
  acceptPeer(request.address, { isAdmin });

  if (isAdmin) {
    console.log(`${request.address} joined as ADMIN`);
  }
}
```

**Why 3 verifiers?**
- Prevents single malicious peer from blocking users or granting false admin status
- Majority vote ensures consensus on ban status AND admin status
- If < 3 peers online, use all available peers
- Each attribute decided independently by majority

---

## Owner & Admin Privileges & Moderation

### Owner/Admin Identification

The Accord **owner** (from blockchain) and **admins** (from admin list) have special privileges:

```javascript
// Check if user is the accord owner
const accord = await contract.getAccord(accordId);
const isOwner = userAddress.toLowerCase() === accord.owner.toLowerCase();

// Check if user is an admin (via verification consensus)
const isAdmin = userVerification.isAdmin; // From verification step

// Owner OR admin can moderate
const canModerate = isOwner || isAdmin;
```

### Host Priority for Owner/Admins

When peers connect, **owner becomes host automatically**, then admins, then first peer:

```javascript
// peer-discovery.ts
async function determineHost(peers, userAddress, accordOwner, isAdmin) {
  // Owner always becomes host (if online)
  if (userAddress.toLowerCase() === accordOwner.toLowerCase()) {
    return { role: 'host', reason: 'owner_priority' };
  }

  // Admin becomes host if owner not present
  if (isAdmin) {
    const ownerOnline = peers.some(
      p => p.address.toLowerCase() === accordOwner.toLowerCase()
    );

    if (!ownerOnline) {
      return { role: 'host', reason: 'admin_priority' };
    }
  }

  // Otherwise, first peer is host
  if (peers.length === 0) {
    return { role: 'host', reason: 'first_peer' };
  }

  // Check if owner is in peer list
  const ownerPeer = peers.find(
    p => p.address.toLowerCase() === accordOwner.toLowerCase()
  );

  if (ownerPeer) {
    // Connect to owner (they're the host)
    return { role: 'peer', host: ownerPeer };
  }

  // Check if admin is in peer list (next priority)
  const adminPeer = peers.find(p => p.isAdmin === true);

  if (adminPeer) {
    return { role: 'peer', host: adminPeer };
  }

  // Connect to first peer (host)
  return { role: 'peer', host: peers[0] };
}
```

### Kicking Users (Owner or Admin)

Owner or admin can kick users by signing a kick message. Kicks persist in-memory for the current session.

**Kicked Users List (In-Memory, Session State):**
```javascript
// Host maintains kicked users list
const kickedUsers = [
  {
    address: '0xBadUser...',
    reason: 'Spam',
    kickedAt: 1704672000,
    kickedBy: '0xAdmin...',
    expiresAt: 1704675600  // 1 hour later
  }
];
```

**Kick Flow:**

```javascript
// kick-user.ts
class KickManager {
  kickedUsers = []; // In-memory, shared with all peers

  async kickUser(targetAddress, reason) {
    // 1. Verify we are owner/admin AND host
    if ((!this.isOwner && !this.isAdmin) || !this.isHost) {
      throw new Error('Must be owner/admin and host to kick');
    }

    // 2. Sign kick message
    const timestamp = Date.now();
    const expiresAt = timestamp + (60 * 60 * 1000); // 1 hour from now
    const message = `Kick ${targetAddress} from ${this.accordId}\nReason: ${reason}\nTimestamp: ${timestamp}`;
    const signature = await this.wallet.signMessage(message);

    // 3. Add to kicked users list
    const kick = {
      address: targetAddress,
      reason,
      kickedAt: timestamp,
      kickedBy: await this.wallet.getAddress(),
      expiresAt,
      signature
    };

    this.kickedUsers.push(kick);

    // 4. Broadcast kick to all peers
    this.broadcast({
      type: 'kick',
      kick,
      message,
      signature
    });

    // 5. Disconnect the target peer
    this.disconnectPeer(targetAddress);

    console.log(`Kicked ${targetAddress} for ${reason} (expires in 1 hour)`);
  }

  // All peers verify and enforce kick
  async handleKickBroadcast(kickMsg, accordOwner, metadata) {
    const signer = ethers.utils.verifyMessage(kickMsg.message, kickMsg.signature);

    // Verify signer is owner or admin
    const isOwner = signer.toLowerCase() === accordOwner.toLowerCase();
    const adminlist = await fetch(metadata.adminlist).then(r => r.json()).catch(() => ({ admins: [] }));
    const isAdmin = adminlist.admins.some(
      a => a.address.toLowerCase() === signer.toLowerCase()
    );

    if (!isOwner && !isAdmin) {
      console.warn('Invalid kick signature, ignoring');
      return false;
    }

    // Add to local kicked users list
    this.kickedUsers.push(kickMsg.kick);

    // Disconnect the kicked user
    const myAddress = await this.wallet.getAddress();
    if (myAddress.toLowerCase() === kickMsg.kick.address.toLowerCase()) {
      console.log(`You have been kicked by ${isOwner ? 'owner' : 'admin'}: ${kickMsg.kick.reason}`);
      this.disconnect();
    } else {
      this.disconnectPeer(kickMsg.kick.address);
    }

    return true;
  }

  // Check if user is kicked (called when someone tries to join)
  isUserKicked(address) {
    const now = Date.now();

    // Filter expired kicks
    this.kickedUsers = this.kickedUsers.filter(k => k.expiresAt > now);

    // Check if address is in kicked list
    return this.kickedUsers.find(
      k => k.address.toLowerCase() === address.toLowerCase()
    );
  }

  // New user joins - send them the kicked users list
  sendKickedListToNewPeer(peerId) {
    if (!this.isHost) return;

    // Clean expired kicks first
    const now = Date.now();
    this.kickedUsers = this.kickedUsers.filter(k => k.expiresAt > now);

    // Send to new peer
    this.sendToPeer(peerId, {
      type: 'kicked_users_list',
      kickedUsers: this.kickedUsers
    });
  }

  // New peer receives kicked users list from host
  handleKickedUsersList(kickedUsers) {
    this.kickedUsers = kickedUsers;
    console.log(`Received kicked users list: ${kickedUsers.length} users`);

    // Check if I'm kicked
    const myAddress = await this.wallet.getAddress();
    const kicked = this.isUserKicked(myAddress);

    if (kicked) {
      console.error(`You are kicked: ${kicked.reason} (expires: ${new Date(kicked.expiresAt)})`);
      this.disconnect();
    }
  }
}
```

**Updated Join Flow (with Kick Check):**

```javascript
// When new user tries to join
async function handleJoinRequest(request, metadata, accordOwner) {
  // 1. Verify signature + check ban list + check admin list (as before)
  const verification = await verifyJoinRequest(request, metadata, accordOwner);

  if (!verification.verified || verification.isBanned) {
    return { allowed: false, reason: verification.reason };
  }

  // 2. Check if user is currently kicked
  const kick = this.isUserKicked(request.address);

  if (kick) {
    const timeLeft = Math.ceil((kick.expiresAt - Date.now()) / 1000 / 60);
    return {
      allowed: false,
      reason: `Kicked: ${kick.reason} (${timeLeft} minutes remaining)`
    };
  }

  // 3. User is allowed to join
  return {
    allowed: true,
    isAdmin: verification.isAdmin
  };
}
```

**Kick Expiration (Auto-cleanup):**

```javascript
// Host runs periodic cleanup (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const before = this.kickedUsers.length;

  this.kickedUsers = this.kickedUsers.filter(k => k.expiresAt > now);

  const removed = before - this.kickedUsers.length;
  if (removed > 0) {
    console.log(`${removed} kick(s) expired`);
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

**Future Enhancement: Manual Unkick (Owner/Admin)**

```javascript
// TODO: Future feature
async function unkickUser(targetAddress) {
  if (!this.isOwner && !this.isAdmin) {
    throw new Error('Must be owner/admin to unkick');
  }

  this.kickedUsers = this.kickedUsers.filter(
    k => k.address.toLowerCase() !== targetAddress.toLowerCase()
  );

  this.broadcast({
    type: 'unkick',
    address: targetAddress
  });

  console.log(`${targetAddress} has been unkicked`);
}
```

### Banning Users (Owner or Admin Updates Ban List)

Owner or admin maintains ban list externally (GitHub, etc.):

```bash
# owner/admin updates GitHub repo: accord-bans/banlist.json
{
  "bans": [
    {
      "address": "0xBadUser...",
      "reason": "Spam",
      "bannedAt": 1704672000,
      "bannedBy": "0xOwner...",
      "signature": "0x..."  # Owner signs ban for proof
    },
    {
      "address": "0xBadUser2...",
      "reason": "Harassment",
      "bannedAt": 1704672100,
      "bannedBy": "0xAdmin789...",
      "signature": "0x..."  # Admin signs ban for proof
    }
  ]
}
```

**Ban signature:**
```javascript
// Owner or Admin signs ban to prove authenticity
const banMessage = `Ban ${address} from ${accordId}\nReason: ${reason}\nTimestamp: ${timestamp}`;
const signature = await wallet.signMessage(banMessage);
```

**New users check ban list before joining** (verified by 3 peers as shown above).

### Adding Admins (Owner Only)

Only the owner can add admins:

```javascript
// add-admin.ts
async function addAdmin(adminAddress, role = 'moderator') {
  // 1. Owner signs admin addition
  const timestamp = Date.now();
  const message = `Add admin ${adminAddress} to ${accordId}\nRole: ${role}\nTimestamp: ${timestamp}`;
  const signature = await wallet.signMessage(message);

  // 2. Update admin list (GitHub, etc.)
  const adminlist = await fetch(metadata.adminlist).then(r => r.json()).catch(() => ({ admins: [] }));

  adminlist.admins.push({
    address: adminAddress,
    addedAt: timestamp,
    addedBy: await wallet.getAddress(),
    signature,
    role
  });

  // 3. Commit to GitHub (or update IPFS, etc.)
  await updateAdminList(adminlist);

  console.log(`${adminAddress} has been added as admin`);
}
```

**Remove admin:**
```javascript
async function removeAdmin(adminAddress) {
  const adminlist = await fetch(metadata.adminlist).then(r => r.json());

  adminlist.admins = adminlist.admins.filter(
    a => a.address.toLowerCase() !== adminAddress.toLowerCase()
  );

  await updateAdminList(adminlist);
  console.log(`${adminAddress} has been removed as admin`);
}
```

---

## IPFS Pinning & Hosting

### Option 1: Pinata (Recommended for MVP)

```javascript
// upload-to-pinata.ts
import pinataSDK from '@pinata/sdk';

const pinata = new pinataSDK({
  pinataApiKey: process.env.PINATA_API_KEY,
  pinataSecretApiKey: process.env.PINATA_SECRET_KEY
});

async function uploadAccordMetadata(metadata) {
  const result = await pinata.pinJSONToIPFS(metadata, {
    pinataMetadata: {
      name: `accord-${metadata.name}`,
      keyvalues: {
        category: metadata.category
      }
    }
  });

  return result.IpfsHash; // "Qm..."
}

// Usage:
const metadata = {
  name: "Cool Accord",
  description: "...",
  icon: "ipfs://QmIcon...",
  banlist: "https://raw.githubusercontent.com/user/accord-bans/main/banlist.json"
};

const ipfsHash = await uploadAccordMetadata(metadata);
// Register on blockchain with this hash
await contract.registerAccord(ipfsHash, { value: ethers.utils.parseEther('0.001') });
```

### Option 2: Web3.Storage (Free, Decentralized)

```javascript
import { Web3Storage } from 'web3.storage';

const client = new Web3Storage({ token: process.env.WEB3_STORAGE_TOKEN });

async function uploadMetadata(metadata) {
  const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
  const file = new File([blob], 'metadata.json');

  const cid = await client.put([file]);
  return cid; // "bafy..."
}
```

### Option 3: Self-Hosted IPFS Node

```bash
# Run local IPFS node
ipfs daemon

# Add metadata
ipfs add metadata.json
# Returns: QmHash...

# Pin to ensure it stays available
ipfs pin add QmHash...
```

---

## Complete Flow: Join Accord with Verification

```javascript
// complete-join-flow.ts
import { ethers } from 'ethers';

class AccordJoinFlow {
  async joinAccord(accordId, wallet) {
    // 1. Fetch accord info from blockchain
    const accord = await contract.getAccord(accordId);

    // 2. Fetch metadata from IPFS
    const metadata = await this.fetchIPFS(accord.ipfsHash);
    console.log(`Joining: ${metadata.name}`);

    // 3. Sign authentication message
    const timestamp = Date.now();
    const message = `Join Accord: ${accordId}\nTimestamp: ${timestamp}`;
    const signature = await wallet.signMessage(message);
    const userAddress = await wallet.getAddress();

    // 4. Find peers via DHT
    const peers = await libp2p.contentRouting.findProviders(accordId);

    // 5. Check if user is the owner (gets host priority)
    const isOwner = userAddress.toLowerCase() === accord.owner.toLowerCase();

    if (isOwner) {
      console.log('You are the owner! Becoming host...');
      this.becomeHost();
      return;
    }

    // 6. Send join request to host
    const joinRequest = {
      type: 'join_request',
      accordId,
      address: userAddress,
      signature,
      message,
      timestamp
    };

    // 7. Host forwards to 3 verifiers (or all if < 3)
    const verifiers = this.selectVerifiers(peers, 3);
    const verifications = await this.requestVerifications(verifiers, joinRequest, metadata);

    // 8. Collect verification results
    const approved = verifications.filter(v => v.verified && !v.banned).length;
    const required = Math.ceil(verifiers.length / 2); // Majority

    if (approved >= required) {
      console.log('Verification passed! Joining...');
      this.connectToPeers(peers);
    } else {
      const banReason = verifications.find(v => v.banned)?.reason;
      throw new Error(`Join denied: ${banReason || 'Verification failed'}`);
    }
  }

  async fetchIPFS(ipfsHash) {
    // Use public gateway or local node
    const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
    return await response.json();
  }

  selectVerifiers(peers, count) {
    // Select up to `count` random peers for verification
    const shuffled = peers.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, peers.length));
  }

  async requestVerifications(verifiers, joinRequest, metadata) {
    // Send verification request to each peer
    const promises = verifiers.map(peer =>
      this.requestVerification(peer, joinRequest, metadata)
    );
    return await Promise.all(promises);
  }

  async requestVerification(peer, joinRequest, metadata) {
    // Ask peer to verify signature and check ban list
    return new Promise((resolve) => {
      peer.send({
        type: 'verify_join',
        request: joinRequest
      });

      peer.once('verification_result', (result) => {
        resolve(result);
      });
    });
  }
}
```

---

## Peer-Side Verification Handler

```javascript
// peer-verifier.ts
class PeerVerifier {
  async handleVerificationRequest(request, metadata) {
    try {
      // 1. Verify signature
      const recoveredAddress = ethers.utils.verifyMessage(
        request.message,
        request.signature
      );

      if (recoveredAddress.toLowerCase() !== request.address.toLowerCase()) {
        return {
          verified: false,
          isBanned: false,
          isAdmin: false,
          reason: 'Invalid signature'
        };
      }

      // 2. Fetch accord owner from blockchain
      const accord = await contract.getAccord(request.accordId);
      const accordOwner = accord.owner;

      // 3. Check if user is owner
      const isOwner = recoveredAddress.toLowerCase() === accordOwner.toLowerCase();

      // 4. Check ban list and admin list
      const [banlist, adminlist] = await Promise.all([
        fetch(metadata.banlist).then(r => r.json()).catch(() => ({ bans: [] })),
        fetch(metadata.adminlist).then(r => r.json()).catch(() => ({ admins: [] }))
      ]);

      // 5. Check if banned
      const ban = banlist.bans.find(
        b => b.address.toLowerCase() === recoveredAddress.toLowerCase()
      );

      if (ban) {
        // Verify ban signature
        const banMessage = `Ban ${ban.address} from ${request.accordId}\nReason: ${ban.reason}\nTimestamp: ${ban.bannedAt}`;
        const banSigner = ethers.utils.verifyMessage(banMessage, ban.signature);

        // Check if banned by owner or admin
        const bannedByOwner = banSigner.toLowerCase() === accordOwner.toLowerCase();
        const bannedByAdmin = adminlist.admins.some(
          a => a.address.toLowerCase() === banSigner.toLowerCase()
        );

        if (bannedByOwner || bannedByAdmin) {
          return {
            verified: true,
            isBanned: true,
            isAdmin: false,
            reason: ban.reason,
            bannedAt: ban.bannedAt
          };
        } else {
          console.warn('Ban signature invalid, ignoring ban');
        }
      }

      // 6. Check if admin
      let isAdmin = isOwner; // Owner is always admin

      if (!isOwner) {
        const adminEntry = adminlist.admins.find(
          a => a.address.toLowerCase() === recoveredAddress.toLowerCase()
        );

        if (adminEntry) {
          // Verify admin signature
          const adminMessage = `Add admin ${adminEntry.address} to ${request.accordId}\nRole: ${adminEntry.role}\nTimestamp: ${adminEntry.addedAt}`;
          const adminSigner = ethers.utils.verifyMessage(adminMessage, adminEntry.signature);

          // Ensure admin was added by owner
          if (adminSigner.toLowerCase() === accordOwner.toLowerCase()) {
            isAdmin = true;
          } else {
            console.warn('Admin signature invalid, ignoring admin status');
          }
        }
      }

      // 7. All checks passed
      return {
        verified: true,
        isBanned: false,
        isAdmin,
        reason: null
      };

    } catch (error) {
      console.error('Verification error:', error);
      return {
        verified: false,
        isBanned: false,
        isAdmin: false,
        reason: 'Verification error'
      };
    }
  }
}
```

---

## Owner/Admin Moderation Actions

### Kick User (Immediate, Temporary)

```javascript
// Owner or admin (and must be host) can kick
class Moderation {
  async kickUser(targetAddress, reason) {
    // 1. Verify we are owner/admin AND host
    if ((!this.isOwner && !this.isAdmin) || !this.isHost) {
      throw new Error('Must be owner/admin and host to kick');
    }

    // 2. Sign kick message
    const timestamp = Date.now();
    const message = `Kick ${targetAddress} from ${this.accordId}\nReason: ${reason}\nTimestamp: ${timestamp}`;
    const signature = await this.wallet.signMessage(message);

    // 3. Broadcast kick to all peers
    this.broadcast({
      type: 'kick',
      target: targetAddress,
      reason,
      message,
      signature,
      timestamp
    });

    // 4. Disconnect the target peer
    this.disconnectPeer(targetAddress);
  }

  // All peers verify and enforce kick
  async handleKickBroadcast(kickMsg) {
    // Verify signature is from accord owner or admin
    const signer = ethers.utils.verifyMessage(kickMsg.message, kickMsg.signature);

    const isOwner = signer.toLowerCase() === this.accordOwner.toLowerCase();

    // Check if signer is admin
    const metadata = await this.fetchMetadata();
    const adminlist = await fetch(metadata.adminlist).then(r => r.json()).catch(() => ({ admins: [] }));
    const isAdmin = adminlist.admins.some(
      a => a.address.toLowerCase() === signer.toLowerCase()
    );

    if (!isOwner && !isAdmin) {
      console.warn('Invalid kick signature, ignoring');
      return;
    }

    // Disconnect the kicked user
    const myAddress = await this.wallet.getAddress();
    if (myAddress.toLowerCase() === kickMsg.target.toLowerCase()) {
      console.log(`You have been kicked by ${isOwner ? 'owner' : 'admin'}: ${kickMsg.reason}`);
      this.disconnect();
    } else {
      this.disconnectPeer(kickMsg.target);
    }
  }
}
```

### Ban User (Permanent, Updates Ban List)

```javascript
async function banUser(targetAddress, reason) {
  // 1. Owner/admin signs ban
  const timestamp = Date.now();
  const message = `Ban ${targetAddress} from ${accordId}\nReason: ${reason}\nTimestamp: ${timestamp}`;
  const signature = await wallet.signMessage(message);

  // 2. Update ban list (GitHub, etc.)
  const banlist = await fetch(metadata.banlist).then(r => r.json()).catch(() => ({ bans: [] }));
  banlist.bans.push({
    address: targetAddress,
    reason,
    bannedAt: timestamp,
    bannedBy: await wallet.getAddress(),
    signature
  });

  // 3. Commit to GitHub (or update IPFS, etc.)
  await updateBanList(banlist);

  // 4. Kick user from current session
  await kickUser(targetAddress, reason);

  console.log(`${targetAddress} has been banned by ${this.isOwner ? 'owner' : 'admin'}`);
}
```

---

## Security Considerations

### ✅ Protections

1. **Signature Verification**: All join requests verified by multiple peers
2. **Majority Vote**: 2/3 or 3/3 verifiers must approve
3. **Owner Signatures**: Kicks/bans signed by owner (cryptographically proven)
4. **Ban List Signatures**: Each ban entry signed by owner (prevents forgery)
5. **Distributed Verification**: No single peer can block legitimate users

### ⚠️ Potential Issues

1. **Ban List Hosting**: Centralized (GitHub, etc.)
   - **Solution**: Owner can host on IPFS, but must update metadata hash on blockchain
   - **Alternative**: Use ENS text records for ban list URL

2. **Owner Offline**: If owner not online, can't kick/ban immediately
   - **Solution**: Delegated moderators (future: owner signs moderator list)

3. **Malicious Verifiers**: Could falsely reject valid users
   - **Solution**: Majority vote (2/3) prevents single bad actor

4. **Spam Join Requests**: Attacker floods with requests
   - **Solution**: Rate limiting, wallet-based throttling

---

## IPFS Layer Summary

| Component | Storage | Mutability | Purpose |
|-----------|---------|------------|---------|
| **Metadata** | IPFS | Immutable | Name, icon, description, rules, list URLs |
| **Ban List** | External URL (GitHub) | Mutable | Permanently banned wallet addresses |
| **Admin List** | External URL (GitHub) | Mutable | Admin wallet addresses |
| **Kicked List** | In-memory (host + peers) | Ephemeral | Temporarily kicked users (1 hour expiry) |
| **Blockchain** | On-chain | Immutable | `accordId → ipfsHash` mapping |

**Flow:**
1. Owner uploads metadata to IPFS → gets hash
2. Owner registers on blockchain with IPFS hash
3. Users fetch metadata from IPFS
4. Users sign message to join
5. 3 peers verify signature + check ban list + check admin list
6. Host checks kicked users list (in-memory, expires 1 hour)
7. Majority vote on `isBanned` and `isAdmin` → user joins or denied
8. New user receives kicked users list from host
9. Owner/admins can:
   - **Kick** (temporary, 1 hour, in-memory only)
   - **Ban** (permanent, update ban list on GitHub)
   - **Add/remove admins** (owner only)

---

## Next Steps

1. Build IPFS upload utility (Pinata/Web3.Storage)
2. Define metadata JSON schema
3. Implement signature verification
4. Build peer verification system
5. Implement owner kick/ban functionality
6. Test ban list updates

---

**Kick vs Ban Comparison:**

| Feature | Kick | Ban |
|---------|------|-----|
| **Duration** | 1 hour (auto-expires) | Permanent (until removed from list) |
| **Storage** | In-memory (session only) | External URL (GitHub) |
| **Persistence** | Lost when all peers leave | Persists forever |
| **Use Case** | Temporary timeout for misbehavior | Permanent removal for serious violations |
| **Who Can Do** | Owner or Admin | Owner or Admin |
| **Signature Required** | Yes | Yes |

**Questions to Consider:**

1. ~~Should ban/admin lists be on IPFS (immutable, must update metadata hash) or external URL (mutable, easier)?~~ **✅ DONE - External URL (GitHub)**
2. ~~Should we add delegated moderators (owner signs list of mod addresses)?~~ **✅ DONE - Admin list implemented**
3. ~~Should kicks be permanent until rejoin, or time-based?~~ **✅ DONE - 1 hour expiry**
4. How to handle ban appeals? (Owner updates ban list to remove entry)
5. Should admins be able to add other admins, or only owner? **Current: Only owner can manage admins**
6. Should kicked users be able to appeal/be manually unkicked before expiry? **Future: Add unkick command**
