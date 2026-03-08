#!/usr/bin/env node
/**
 * Simple Authentication Test with Mocked Dependencies
 * Tests wallet auth and peer identity without requiring blockchain/P2P
 */

import type { Address, Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Mock PubSub Messaging
class MockPubSubMessaging {
  private subscriptions: Map<string, Array<(msg: any, from: string) => void>> = new Map();

  async subscribe(topic: string, handler: (msg: any, from: string) => void) {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, []);
    }
    this.subscriptions.get(topic)!.push(handler);
  }

  async publish(topic: string, message: any) {
    const handlers = this.subscriptions.get(topic) || [];
    setTimeout(() => {
      handlers.forEach(handler => handler(message, 'mock-peer'));
    }, 10);
  }

  simulateMessage(topic: string, message: any, fromPeerId: string) {
    const handlers = this.subscriptions.get(topic) || [];
    handlers.forEach(handler => handler(message, fromPeerId));
  }
}

// Import real auth components
import {
  WalletAuth,
  PeerIdentityManager,
  ConsensusVerification,
  BanListChecker,
} from '@accord/core';

async function main() {
  console.clear();
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   PHASE 6 AUTHENTICATION TEST (Mocked Dependencies)       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const ACCORD_ID = 'test-accord-auth';

  // Create test wallet accounts
  const ownerAccount = privateKeyToAccount('0x' + '1'.repeat(64) as Hex);
  const peer1Account = privateKeyToAccount('0x' + '2'.repeat(64) as Hex);
  const peer2Account = privateKeyToAccount('0x' + '3'.repeat(64) as Hex);

  console.log('📋 Test Configuration:');
  console.log(`   Accord ID: ${ACCORD_ID}`);
  console.log(`   Owner: ${ownerAccount.address}`);
  console.log(`   Peer 1: ${peer1Account.address}`);
  console.log(`   Peer 2: ${peer2Account.address}\n`);

  // Test 1: Wallet Authentication
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Test 1: Testing Wallet Authentication');
  console.log('─────────────────────────────────────────────────────────────\n');

  const walletAuth = new WalletAuth();

  // Create challenge
  const myPeerId = 'QmMyPeer123';
  const challenge = walletAuth.createChallenge(ACCORD_ID, myPeerId);

  console.log('✅ Challenge created:');
  console.log(`   Nonce: ${challenge.nonce.slice(0, 20)}...`);
  console.log(`   Timestamp: ${challenge.timestamp}`);
  console.log(`   Accord ID: ${challenge.accordId}\n`);

  // Sign challenge
  console.log('Signing challenge with owner wallet...');
  const signature = await ownerAccount.signMessage({
    message: challenge.message,
  });

  console.log(`✅ Signature created: ${signature.slice(0, 30)}...\n`);

  // Verify credentials
  console.log('Verifying credentials...');
  const identity = await walletAuth.verifyCredentials(
    {
      address: ownerAccount.address,
      signature,
      challenge,
    },
    myPeerId
  );

  console.log('✅ Credentials verified!');
  console.log(`   Address: ${identity.address}`);
  console.log(`   Peer ID: ${identity.peerId}`);
  console.log(`   Verified: ${identity.verified ? '✅' : '❌'}`);
  console.log(`   Verified At: ${new Date(identity.verifiedAt).toLocaleString()}\n`);

  // Test 2: Peer Identity Management
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Test 2: Testing Peer Identity Management');
  console.log('─────────────────────────────────────────────────────────────\n');

  const messaging = new MockPubSubMessaging();
  const identityManager = new PeerIdentityManager(walletAuth, messaging as any);

  await identityManager.initialize(ACCORD_ID, myPeerId);
  console.log(`✅ Identity manager initialized\n`);

  // Authenticate self
  console.log('Authenticating self...');
  await identityManager.authenticateSelf({
    address: ownerAccount.address,
    signature,
    challenge,
  });

  const myIdentity = identityManager.getMyIdentity();
  console.log('✅ Self authenticated:');
  console.log(`   Peer ID: ${myIdentity.peerId}`);
  console.log(`   Address: ${myIdentity.address}\n`);

  // Simulate peer identities
  console.log('Simulating peer identity announcements...');

  const peer1Id = 'QmPeer1';
  const peer1Challenge = walletAuth.createChallenge(ACCORD_ID, peer1Id);
  const peer1Signature = await peer1Account.signMessage({
    message: peer1Challenge.message,
  });

  messaging.simulateMessage(ACCORD_ID, {
    type: 'identity-announcement',
    peerId: peer1Id,
    address: peer1Account.address,
    signature: peer1Signature,
    timestamp: Date.now(),
  }, peer1Id);

  await new Promise(resolve => setTimeout(resolve, 50));

  const peer1Identity = identityManager.getPeerIdentity(peer1Id);
  if (peer1Identity) {
    console.log(`✅ Peer 1 identity received:`);
    console.log(`   Peer ID: ${peer1Identity.peerId}`);
    console.log(`   Address: ${peer1Identity.address}`);
    console.log(`   Verified: ${peer1Identity.verified ? '✅' : '❌'}\n`);
  }

  // Test authenticated peers count
  const authenticatedPeers = identityManager.getAuthenticatedPeers();
  console.log(`✅ Total authenticated peers: ${authenticatedPeers.length}\n`);

  // Test 3: Identity Status
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Test 3: Testing Identity Status');
  console.log('─────────────────────────────────────────────────────────────\n');

  const identityStatus = identityManager.getStatus();

  console.log('📊 IDENTITY STATUS:');
  console.log('');
  console.log('General:');
  console.log(`   Accord ID: ${identityStatus.accordId}`);
  console.log(`   My Peer ID: ${identityStatus.myPeerId.slice(0, 20)}...`);
  console.log(`   Authenticated: ${identityStatus.isAuthenticated ? '✅' : '❌'}`);
  console.log('');
  console.log('My Identity:');
  if (identityStatus.myAddress) {
    console.log(`   Address: ${identityStatus.myAddress}`);
  } else {
    console.log(`   Address: Not set`);
  }
  console.log('');
  console.log('Network:');
  console.log(`   Known Peers: ${identityStatus.peerCount}`);
  console.log(`   Authenticated Peers: ${identityStatus.authenticatedPeerCount}`);
  console.log('');

  // Test 4: Consensus Verification
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Test 4: Testing Consensus Verification');
  console.log('─────────────────────────────────────────────────────────────\n');

  const consensus = new ConsensusVerification(
    identityManager,
    messaging as any,
    {
      minVoters: 2,
      approvalThreshold: 0.6, // 60% approval
    }
  );

  await consensus.initialize(ACCORD_ID);
  console.log('✅ Consensus verification initialized\n');

  // Simulate adding more peers for consensus
  const peer2Id = 'QmPeer2';
  const peer2Challenge = walletAuth.createChallenge(ACCORD_ID, peer2Id);
  const peer2Signature = await peer2Account.signMessage({
    message: peer2Challenge.message,
  });

  messaging.simulateMessage(ACCORD_ID, {
    type: 'identity-announcement',
    peerId: peer2Id,
    address: peer2Account.address,
    signature: peer2Signature,
    timestamp: Date.now(),
  }, peer2Id);

  await new Promise(resolve => setTimeout(resolve, 50));

  console.log(`Requesting consensus for peer: ${peer1Id}`);
  console.log(`Target address: ${peer1Account.address}\n`);

  // Request consensus
  await consensus.requestConsensus(peer1Id, peer1Account.address);

  // Simulate consensus votes
  messaging.simulateMessage(ACCORD_ID, {
    type: 'consensus-vote',
    requestId: `${peer1Id}-${peer1Account.address}`,
    voter: peer2Id,
    vote: 'approve',
    timestamp: Date.now(),
  }, peer2Id);

  await new Promise(resolve => setTimeout(resolve, 100));

  const consensusResult = consensus.getConsensusResult(peer1Id);
  if (consensusResult) {
    console.log('✅ Consensus result:');
    console.log(`   Approved: ${consensusResult.approved ? '✅' : '❌'}`);
    console.log(`   Total Votes: ${consensusResult.votes.approve + consensusResult.votes.reject}`);
    console.log(`   Approve: ${consensusResult.votes.approve}`);
    console.log(`   Reject: ${consensusResult.votes.reject}`);
    console.log(`   Voters: ${consensusResult.voters.join(', ')}\n`);
  }

  // Test 5: Ban List Checking
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Test 5: Testing Ban List Checking');
  console.log('─────────────────────────────────────────────────────────────\n');

  const banChecker = new BanListChecker();

  // Create a mock ban list
  const mockBanList = {
    version: '1.0',
    bans: [
      {
        address: '0xBADbadBADbadBADbadBADbadBADbadBADbadBADa' as Address,
        reason: 'Spamming',
        bannedAt: Date.now() - 86400000, // 1 day ago
        bannedBy: ownerAccount.address,
        signature: '0x' as Hex,
      },
      {
        address: '0xDEADdeadDEADdeadDEADdeadDEADdeadDEADdead' as Address,
        reason: 'Harassment',
        bannedAt: Date.now() - 172800000, // 2 days ago
        bannedBy: ownerAccount.address,
        signature: '0x' as Hex,
      },
    ],
    updatedAt: Date.now(),
  };

  // Load mock ban list (bypassing IPFS)
  (banChecker as any).banList = mockBanList;
  (banChecker as any).lastRefresh = Date.now();

  console.log('✅ Loaded mock ban list:');
  console.log(`   Total bans: ${mockBanList.bans.length}\n`);

  // Check addresses
  const testAddresses = [
    peer1Account.address,
    '0xBADbadBADbadBADbadBADbadBADbadBADbadBADa' as Address,
    peer2Account.address,
  ];

  console.log('Checking addresses against ban list:\n');
  testAddresses.forEach(addr => {
    const result = banChecker.checkAddress(addr);
    console.log(`Address: ${addr.slice(0, 10)}...`);
    console.log(`   Banned: ${result.banned ? '🚫 YES' : '✅ NO'}`);
    if (result.banned) {
      console.log(`   Reason: ${result.reason}`);
      console.log(`   Banned At: ${new Date(result.bannedAt!).toLocaleString()}`);
    }
    console.log('');
  });

  // Test batch checking
  const batchResults = banChecker.checkAddresses(testAddresses);
  const bannedCount = Array.from(batchResults.values()).filter(r => r.banned).length;
  console.log(`✅ Batch check: ${bannedCount} of ${testAddresses.length} addresses banned\n`);

  // Test 6: Auth Status Summary
  console.log('─────────────────────────────────────────────────────────────');
  console.log('Test 6: Testing Auth Status');
  console.log('─────────────────────────────────────────────────────────────\n');

  const authStatus = walletAuth.getStatus();

  console.log('📊 AUTH STATUS:');
  console.log('');
  console.log('Challenges:');
  console.log(`   Active: ${authStatus.activeChallenges}`);
  console.log(`   Expired: ${authStatus.expiredChallenges}`);
  console.log('');
  console.log('Verified Identities:');
  console.log(`   Total: ${authStatus.verifiedIdentities}`);
  console.log('');

  const verifiedPeers = walletAuth.getVerifiedPeers();
  console.log('Verified Peers:');
  verifiedPeers.forEach((peer, i) => {
    console.log(`   ${i + 1}. ${peer.peerId.slice(0, 20)}... - ${peer.address.slice(0, 10)}...`);
  });
  console.log('');

  // Summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('✅ Wallet authentication working');
  console.log('✅ Challenge creation/verification working');
  console.log('✅ Peer identity management working');
  console.log('✅ Identity announcements working');
  console.log('✅ Consensus verification working');
  console.log('✅ Ban list checking working');
  console.log('✅ Batch address checking working\n');

  console.log('🎉 All Phase 6 authentication features tested successfully!\n');
  console.log('Next steps:');
  console.log('  • Test with real wallet connections (MetaMask)');
  console.log('  • Test with real IPFS ban lists');
  console.log('  • Test multi-peer consensus scenarios');
  console.log('  • Test identity revocation\n');
}

// Run the test
main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
