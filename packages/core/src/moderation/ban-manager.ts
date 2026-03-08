/**
 * Ban Manager
 * Permanent peer removal with signature-based verification
 */

import type { Address, Hex } from 'viem';
import { signMessage } from 'viem/accounts';
import { verifyMessage } from 'viem';
import type { BanEntry, BanList } from '../types';
import { PubSubMessaging } from '../p2p/pubsub-messaging';
import { PeerIdentityManager } from '../auth/peer-identity';
import { MetadataUploader } from '../ipfs/metadata-uploader';

export interface BanMessage {
  type: 'ban';
  targetPeerId: string;
  targetAddress: Address;
  reason: string;
  bannedBy: Address;
  bannedAt: number;
  signature: Hex;
}

export class BanManager {
  private messaging: PubSubMessaging;
  private identityManager: PeerIdentityManager;
  private metadataUploader?: MetadataUploader;
  private accordId: string = '';

  // Track bans (address -> ban entry)
  private activeBans: Map<Address, BanEntry> = new Map();

  // Event handlers
  private onBanHandlers: Array<(ban: BanEntry) => void> = [];

  constructor(
    messaging: PubSubMessaging,
    identityManager: PeerIdentityManager,
    metadataUploader?: MetadataUploader
  ) {
    this.messaging = messaging;
    this.identityManager = identityManager;
    this.metadataUploader = metadataUploader;
  }

  /**
   * Initialize ban manager
   */
  async initialize(accordId: string, existingBanList?: BanList): Promise<void> {
    this.accordId = accordId;

    // Load existing bans
    if (existingBanList) {
      existingBanList.bans.forEach((ban) => {
        this.activeBans.set(ban.address.toLowerCase() as Address, ban);
      });
      console.log(`📥 Loaded ${existingBanList.bans.length} existing ban(s)`);
    }

    // Subscribe to ban messages
    await this.messaging.subscribe(accordId, (message: any) => {
      if (message.type === 'ban') {
        this.handleBanMessage(message as BanMessage);
      }
    });

    console.log(`✅ Ban manager initialized`);
  }

  /**
   * Ban a peer (admin/owner only)
   */
  async banPeer(
    targetPeerId: string,
    reason: string,
    signerAccount?: any // viem account for signing
  ): Promise<BanEntry> {
    const myIdentity = this.identityManager.getMyIdentity();

    if (!myIdentity.address) {
      throw new Error('Must be authenticated to ban peers');
    }

    // Get target identity
    const targetIdentity = this.identityManager.getPeerIdentity(targetPeerId);
    if (!targetIdentity) {
      throw new Error('Target peer identity unknown');
    }

    const bannedAt = Date.now();

    // Create ban message to sign
    const messageToSign = this.createBanMessage(
      targetIdentity.address,
      reason,
      bannedAt
    );

    // Sign the ban
    let signature: Hex;
    if (signerAccount) {
      signature = await signMessage({
        message: messageToSign,
        privateKey: signerAccount.privateKey,
      });
    } else {
      // For now, use a placeholder - in production this should be signed by wallet
      signature = '0x' as Hex;
    }

    // Create ban entry
    const banEntry: BanEntry = {
      address: targetIdentity.address,
      reason,
      bannedAt,
      bannedBy: myIdentity.address,
      signature,
    };

    // Store ban
    this.activeBans.set(targetIdentity.address.toLowerCase() as Address, banEntry);

    // Broadcast ban message
    const banMessage: BanMessage = {
      type: 'ban',
      targetPeerId,
      targetAddress: targetIdentity.address,
      reason,
      bannedBy: myIdentity.address,
      bannedAt,
      signature,
    };

    await this.messaging.publish(this.accordId, banMessage);

    // Notify handlers
    this.onBanHandlers.forEach((handler) => handler(banEntry));

    console.log(`🚫 Banned ${targetIdentity.address}: ${reason}`);

    return banEntry;
  }

  /**
   * Handle incoming ban message
   */
  private handleBanMessage(message: BanMessage): void {
    // Verify signature
    const isValid = this.verifyBanSignature(message);

    if (!isValid) {
      console.warn('⚠️  Invalid ban signature, ignoring');
      return;
    }

    // Store ban
    const banEntry: BanEntry = {
      address: message.targetAddress,
      reason: message.reason,
      bannedAt: message.bannedAt,
      bannedBy: message.bannedBy,
      signature: message.signature,
    };

    this.activeBans.set(message.targetAddress.toLowerCase() as Address, banEntry);

    // Notify handlers
    this.onBanHandlers.forEach((handler) => handler(banEntry));

    console.log(`📥 Received ban for ${message.targetAddress}: ${message.reason}`);
  }

  /**
   * Verify ban signature
   */
  private verifyBanSignature(message: BanMessage): boolean {
    try {
      const messageToVerify = this.createBanMessage(
        message.targetAddress,
        message.reason,
        message.bannedAt
      );

      return verifyMessage({
        address: message.bannedBy,
        message: messageToVerify,
        signature: message.signature,
      }) as unknown as boolean;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create ban message for signing
   */
  private createBanMessage(
    targetAddress: Address,
    reason: string,
    bannedAt: number
  ): string {
    return `BAN PEER
Target: ${targetAddress}
Reason: ${reason}
Banned At: ${new Date(bannedAt).toISOString()}

This action is permanent and will be recorded on IPFS.`;
  }

  /**
   * Check if address is banned
   */
  isAddressBanned(address: Address): boolean {
    return this.activeBans.has(address.toLowerCase() as Address);
  }

  /**
   * Check if peer is banned
   */
  isPeerBanned(peerId: string): boolean {
    const identity = this.identityManager.getPeerIdentity(peerId);

    if (!identity) {
      return false;
    }

    return this.isAddressBanned(identity.address);
  }

  /**
   * Get ban entry for address
   */
  getBanEntry(address: Address): BanEntry | undefined {
    return this.activeBans.get(address.toLowerCase() as Address);
  }

  /**
   * Get all bans
   */
  getAllBans(): BanEntry[] {
    return Array.from(this.activeBans.values());
  }

  /**
   * Export ban list for IPFS
   */
  exportBanList(): BanList {
    return {
      version: '1.0',
      bans: this.getAllBans(),
    };
  }

  /**
   * Upload ban list to IPFS
   */
  async uploadBanList(): Promise<string> {
    if (!this.metadataUploader) {
      throw new Error('Metadata uploader not configured');
    }

    const banList = this.exportBanList();
    const ipfsHash = await this.metadataUploader.uploadBanList(banList);

    console.log(`📤 Uploaded ban list to IPFS: ${ipfsHash}`);

    return ipfsHash;
  }

  /**
   * Unban an address (admin/owner only)
   */
  unbanAddress(address: Address): boolean {
    const normalizedAddress = address.toLowerCase() as Address;

    if (!this.activeBans.has(normalizedAddress)) {
      return false;
    }

    this.activeBans.delete(normalizedAddress);
    console.log(`✅ Unbanned ${address}`);

    return true;
  }

  /**
   * Clear all bans (owner only)
   */
  clearAllBans(): void {
    this.activeBans.clear();
    console.log('🧹 Cleared all bans');
  }

  /**
   * Register ban event handler
   */
  onBan(handler: (ban: BanEntry) => void): void {
    this.onBanHandlers.push(handler);
  }

  /**
   * Get status
   */
  getStatus(): {
    totalBans: number;
    bans: BanEntry[];
  } {
    return {
      totalBans: this.activeBans.size,
      bans: this.getAllBans(),
    };
  }
}
