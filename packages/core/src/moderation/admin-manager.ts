/**
 * Admin Manager
 * Manage admin roles with signature verification
 */

import type { Address, Hex } from 'viem';
import { signMessage } from 'viem/accounts';
import { verifyMessage } from 'viem';
import type { AdminEntry, AdminList } from '../types';
import { PubSubMessaging } from '../p2p/pubsub-messaging';
import { PeerIdentityManager } from '../auth/peer-identity';
import { MetadataUploader } from '../ipfs/metadata-uploader';

export interface AdminMessage {
  type: 'admin-add' | 'admin-remove';
  targetAddress: Address;
  role: string;
  addedBy: Address;
  addedAt: number;
  signature: Hex;
}

export class AdminManager {
  private messaging: PubSubMessaging;
  private identityManager: PeerIdentityManager;
  private metadataUploader?: MetadataUploader;
  private accordId: string = '';
  private ownerAddress: Address | null = null;

  // Track admins (address -> admin entry)
  private admins: Map<Address, AdminEntry> = new Map();

  // Event handlers
  private onAdminAddHandlers: Array<(admin: AdminEntry) => void> = [];
  private onAdminRemoveHandlers: Array<(address: Address) => void> = [];

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
   * Initialize admin manager
   */
  async initialize(
    accordId: string,
    ownerAddress: Address,
    existingAdminList?: AdminList
  ): Promise<void> {
    this.accordId = accordId;
    this.ownerAddress = ownerAddress.toLowerCase() as Address;

    // Load existing admins
    if (existingAdminList) {
      existingAdminList.admins.forEach((admin) => {
        this.admins.set(admin.address.toLowerCase() as Address, admin);
      });
      console.log(`📥 Loaded ${existingAdminList.admins.length} existing admin(s)`);
    }

    // Subscribe to admin messages
    await this.messaging.subscribe(accordId, (message: any) => {
      if (message.type === 'admin-add' || message.type === 'admin-remove') {
        this.handleAdminMessage(message as AdminMessage);
      }
    });

    console.log(`✅ Admin manager initialized (Owner: ${this.ownerAddress})`);
  }

  /**
   * Add an admin (owner only)
   */
  async addAdmin(
    targetAddress: Address,
    role: string = 'moderator',
    signerAccount?: any
  ): Promise<AdminEntry> {
    const myIdentity = this.identityManager.getMyIdentity();

    if (!myIdentity.address) {
      throw new Error('Must be authenticated to add admins');
    }

    // Only owner can add admins
    if (myIdentity.address.toLowerCase() !== this.ownerAddress?.toLowerCase()) {
      throw new Error('Only owner can add admins');
    }

    const addedAt = Date.now();

    // Create message to sign
    const messageToSign = this.createAdminMessage(
      'add',
      targetAddress,
      role,
      addedAt
    );

    // Sign
    let signature: Hex;
    if (signerAccount) {
      signature = await signMessage({
        message: messageToSign,
        privateKey: signerAccount.privateKey,
      });
    } else {
      signature = '0x' as Hex;
    }

    // Create admin entry
    const adminEntry: AdminEntry = {
      address: targetAddress.toLowerCase() as Address,
      addedAt,
      addedBy: myIdentity.address,
      signature,
      role,
    };

    // Store admin
    this.admins.set(targetAddress.toLowerCase() as Address, adminEntry);

    // Broadcast message
    const adminMessage: AdminMessage = {
      type: 'admin-add',
      targetAddress,
      role,
      addedBy: myIdentity.address,
      addedAt,
      signature,
    };

    await this.messaging.publish(this.accordId, adminMessage);

    // Notify handlers
    this.onAdminAddHandlers.forEach((handler) => handler(adminEntry));

    console.log(`✅ Added admin: ${targetAddress} (${role})`);

    return adminEntry;
  }

  /**
   * Remove an admin (owner only)
   */
  async removeAdmin(
    targetAddress: Address,
    signerAccount?: any
  ): Promise<boolean> {
    const myIdentity = this.identityManager.getMyIdentity();

    if (!myIdentity.address) {
      throw new Error('Must be authenticated to remove admins');
    }

    // Only owner can remove admins
    if (myIdentity.address.toLowerCase() !== this.ownerAddress?.toLowerCase()) {
      throw new Error('Only owner can remove admins');
    }

    const normalizedAddress = targetAddress.toLowerCase() as Address;

    if (!this.admins.has(normalizedAddress)) {
      return false;
    }

    // Create message to sign
    const messageToSign = this.createAdminMessage(
      'remove',
      targetAddress,
      '',
      Date.now()
    );

    // Sign
    let signature: Hex;
    if (signerAccount) {
      signature = await signMessage({
        message: messageToSign,
        privateKey: signerAccount.privateKey,
      });
    } else {
      signature = '0x' as Hex;
    }

    // Remove admin
    this.admins.delete(normalizedAddress);

    // Broadcast message
    const adminMessage: AdminMessage = {
      type: 'admin-remove',
      targetAddress,
      role: '',
      addedBy: myIdentity.address,
      addedAt: Date.now(),
      signature,
    };

    await this.messaging.publish(this.accordId, adminMessage);

    // Notify handlers
    this.onAdminRemoveHandlers.forEach((handler) => handler(normalizedAddress));

    console.log(`❌ Removed admin: ${targetAddress}`);

    return true;
  }

  /**
   * Handle incoming admin message
   */
  private handleAdminMessage(message: AdminMessage): void {
    // Verify signature
    const isValid = this.verifyAdminSignature(message);

    if (!isValid) {
      console.warn('⚠️  Invalid admin signature, ignoring');
      return;
    }

    // Verify sender is owner
    if (message.addedBy.toLowerCase() !== this.ownerAddress?.toLowerCase()) {
      console.warn('⚠️  Admin message from non-owner, ignoring');
      return;
    }

    const normalizedAddress = message.targetAddress.toLowerCase() as Address;

    if (message.type === 'admin-add') {
      const adminEntry: AdminEntry = {
        address: normalizedAddress,
        addedAt: message.addedAt,
        addedBy: message.addedBy,
        signature: message.signature,
        role: message.role,
      };

      this.admins.set(normalizedAddress, adminEntry);
      this.onAdminAddHandlers.forEach((handler) => handler(adminEntry));

      console.log(`📥 Added admin: ${normalizedAddress} (${message.role})`);
    } else if (message.type === 'admin-remove') {
      this.admins.delete(normalizedAddress);
      this.onAdminRemoveHandlers.forEach((handler) => handler(normalizedAddress));

      console.log(`📥 Removed admin: ${normalizedAddress}`);
    }
  }

  /**
   * Verify admin signature
   */
  private verifyAdminSignature(message: AdminMessage): boolean {
    try {
      const action = message.type === 'admin-add' ? 'add' : 'remove';
      const messageToVerify = this.createAdminMessage(
        action,
        message.targetAddress,
        message.role,
        message.addedAt
      );

      return verifyMessage({
        address: message.addedBy,
        message: messageToVerify,
        signature: message.signature,
      }) as unknown as boolean;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create admin message for signing
   */
  private createAdminMessage(
    action: 'add' | 'remove',
    targetAddress: Address,
    role: string,
    timestamp: number
  ): string {
    if (action === 'add') {
      return `ADD ADMIN
Target: ${targetAddress}
Role: ${role}
Timestamp: ${new Date(timestamp).toISOString()}`;
    } else {
      return `REMOVE ADMIN
Target: ${targetAddress}
Timestamp: ${new Date(timestamp).toISOString()}`;
    }
  }

  /**
   * Check if address is admin
   */
  isAdmin(address: Address): boolean {
    return this.admins.has(address.toLowerCase() as Address);
  }

  /**
   * Check if address is owner
   */
  isOwner(address: Address): boolean {
    return address.toLowerCase() === this.ownerAddress?.toLowerCase();
  }

  /**
   * Check if address is admin or owner
   */
  isAdminOrOwner(address: Address): boolean {
    return this.isOwner(address) || this.isAdmin(address);
  }

  /**
   * Check if peer is admin
   */
  isPeerAdmin(peerId: string): boolean {
    const identity = this.identityManager.getPeerIdentity(peerId);

    if (!identity) {
      return false;
    }

    return this.isAdmin(identity.address);
  }

  /**
   * Check if peer is owner
   */
  isPeerOwner(peerId: string): boolean {
    const identity = this.identityManager.getPeerIdentity(peerId);

    if (!identity) {
      return false;
    }

    return this.isOwner(identity.address);
  }

  /**
   * Check if peer is admin or owner
   */
  isPeerAdminOrOwner(peerId: string): boolean {
    return this.isPeerOwner(peerId) || this.isPeerAdmin(peerId);
  }

  /**
   * Get admin entry
   */
  getAdminEntry(address: Address): AdminEntry | undefined {
    return this.admins.get(address.toLowerCase() as Address);
  }

  /**
   * Get all admins
   */
  getAllAdmins(): AdminEntry[] {
    return Array.from(this.admins.values());
  }

  /**
   * Export admin list for IPFS
   */
  exportAdminList(): AdminList {
    return {
      version: '1.0',
      admins: this.getAllAdmins(),
    };
  }

  /**
   * Upload admin list to IPFS
   */
  async uploadAdminList(): Promise<string> {
    if (!this.metadataUploader) {
      throw new Error('Metadata uploader not configured');
    }

    const adminList = this.exportAdminList();
    const ipfsHash = await this.metadataUploader.uploadAdminList(adminList);

    console.log(`📤 Uploaded admin list to IPFS: ${ipfsHash}`);

    return ipfsHash;
  }

  /**
   * Register event handlers
   */
  onAdminAdd(handler: (admin: AdminEntry) => void): void {
    this.onAdminAddHandlers.push(handler);
  }

  onAdminRemove(handler: (address: Address) => void): void {
    this.onAdminRemoveHandlers.push(handler);
  }

  /**
   * Get status
   */
  getStatus(): {
    owner: Address | null;
    totalAdmins: number;
    admins: AdminEntry[];
  } {
    return {
      owner: this.ownerAddress,
      totalAdmins: this.admins.size,
      admins: this.getAllAdmins(),
    };
  }
}
