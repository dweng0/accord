/**
 * Kick Manager
 * Temporary peer removal with expiration
 */

import type { Address, Hex } from 'viem';
import { signMessage } from 'viem/accounts';
import { verifyMessage } from 'viem';
import type { KickEntry } from '../types';
import { PubSubMessaging } from '../p2p/pubsub-messaging';
import { PeerIdentityManager } from '../auth/peer-identity';

export interface KickMessageData {
  type: 'kick';
  targetPeerId: string;
  targetAddress: Address;
  reason: string;
  kickedBy: Address;
  kickedAt: number;
  expiresAt: number;
  signature: Hex;
}

export interface KickConfig {
  defaultDuration?: number; // Default: 1 hour
  maxDuration?: number; // Default: 7 days
}

export class KickManager {
  private messaging: PubSubMessaging;
  private identityManager: PeerIdentityManager;
  private accordId: string = '';
  private config: KickConfig;

  // Track active kicks (peerId -> kick entry)
  private activeKicks: Map<string, KickEntry> = new Map();

  // Event handlers
  private onKickHandlers: Array<(kick: KickEntry) => void> = [];

  constructor(
    messaging: PubSubMessaging,
    identityManager: PeerIdentityManager,
    config: KickConfig = {}
  ) {
    this.messaging = messaging;
    this.identityManager = identityManager;
    this.config = {
      defaultDuration: config.defaultDuration || 60 * 60 * 1000, // 1 hour
      maxDuration: config.maxDuration || 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  }

  /**
   * Initialize kick manager
   */
  async initialize(accordId: string): Promise<void> {
    this.accordId = accordId;

    // Subscribe to kick messages
    await this.messaging.subscribe(accordId, (message: any) => {
      if (message.type === 'kick') {
        this.handleKickMessage(message as KickMessageData);
      }
    });

    // Start cleanup timer
    this.startCleanupTimer();

    console.log(`✅ Kick manager initialized`);
  }

  /**
   * Kick a peer (admin/owner only)
   */
  async kickPeer(
    targetPeerId: string,
    reason: string,
    duration?: number,
    signerAccount?: any // viem account for signing
  ): Promise<KickEntry> {
    const myIdentity = this.identityManager.getMyIdentity();

    if (!myIdentity.address) {
      throw new Error('Must be authenticated to kick peers');
    }

    // Get target identity
    const targetIdentity = this.identityManager.getPeerIdentity(targetPeerId);
    if (!targetIdentity) {
      throw new Error('Target peer identity unknown');
    }

    // Calculate expiry
    const kickedAt = Date.now();
    const kickDuration = duration || this.config.defaultDuration!;

    // Enforce max duration
    const finalDuration = Math.min(kickDuration, this.config.maxDuration!);
    const expiresAt = kickedAt + finalDuration;

    // Create kick message to sign
    const messageToSign = this.createKickMessage(
      targetIdentity.address,
      reason,
      kickedAt,
      expiresAt
    );

    // Sign the kick
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

    // Create kick entry
    const kickEntry: KickEntry = {
      address: targetIdentity.address,
      reason,
      kickedAt,
      kickedBy: myIdentity.address,
      expiresAt,
      signature,
    };

    // Store kick
    this.activeKicks.set(targetPeerId, kickEntry);

    // Broadcast kick message
    const kickMessage: KickMessageData = {
      type: 'kick',
      targetPeerId,
      targetAddress: targetIdentity.address,
      reason,
      kickedBy: myIdentity.address,
      kickedAt,
      expiresAt,
      signature,
    };

    await this.messaging.publish(this.accordId, kickMessage);

    // Notify handlers
    this.onKickHandlers.forEach((handler) => handler(kickEntry));

    console.log(`⚠️  Kicked ${targetPeerId} for ${this.formatDuration(finalDuration)}: ${reason}`);

    return kickEntry;
  }

  /**
   * Handle incoming kick message
   */
  private handleKickMessage(message: KickMessageData): void {
    // Verify signature (optional but recommended)
    const isValid = this.verifyKickSignature(message);

    if (!isValid) {
      console.warn('⚠️  Invalid kick signature, ignoring');
      return;
    }

    // Store kick
    const kickEntry: KickEntry = {
      address: message.targetAddress,
      reason: message.reason,
      kickedAt: message.kickedAt,
      kickedBy: message.kickedBy,
      expiresAt: message.expiresAt,
      signature: message.signature,
    };

    this.activeKicks.set(message.targetPeerId, kickEntry);

    // Notify handlers
    this.onKickHandlers.forEach((handler) => handler(kickEntry));

    console.log(`📥 Received kick for ${message.targetPeerId}: ${message.reason}`);
  }

  /**
   * Verify kick signature
   */
  private verifyKickSignature(message: KickMessageData): boolean {
    try {
      const messageToVerify = this.createKickMessage(
        message.targetAddress,
        message.reason,
        message.kickedAt,
        message.expiresAt
      );

      return verifyMessage({
        address: message.kickedBy,
        message: messageToVerify,
        signature: message.signature,
      }) as unknown as boolean;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create kick message for signing
   */
  private createKickMessage(
    targetAddress: Address,
    reason: string,
    kickedAt: number,
    expiresAt: number
  ): string {
    return `KICK PEER
Target: ${targetAddress}
Reason: ${reason}
Kicked At: ${new Date(kickedAt).toISOString()}
Expires At: ${new Date(expiresAt).toISOString()}`;
  }

  /**
   * Check if peer is kicked
   */
  isPeerKicked(peerId: string): boolean {
    const kick = this.activeKicks.get(peerId);

    if (!kick) {
      return false;
    }

    // Check if expired
    if (Date.now() > kick.expiresAt) {
      this.activeKicks.delete(peerId);
      return false;
    }

    return true;
  }

  /**
   * Get kick entry for peer
   */
  getKickEntry(peerId: string): KickEntry | undefined {
    const kick = this.activeKicks.get(peerId);

    if (!kick) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > kick.expiresAt) {
      this.activeKicks.delete(peerId);
      return undefined;
    }

    return kick;
  }

  /**
   * Get time remaining on kick
   */
  getKickTimeRemaining(peerId: string): number {
    const kick = this.activeKicks.get(peerId);

    if (!kick) {
      return 0;
    }

    const remaining = kick.expiresAt - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Remove expired kicks
   */
  private cleanupExpiredKicks(): void {
    const now = Date.now();
    let cleaned = 0;

    this.activeKicks.forEach((kick, peerId) => {
      if (now > kick.expiresAt) {
        this.activeKicks.delete(peerId);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired kick(s)`);
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredKicks();
    }, 60 * 1000); // Every minute
  }

  /**
   * Get all active kicks
   */
  getActiveKicks(): Map<string, KickEntry> {
    // Clean up first
    this.cleanupExpiredKicks();
    return new Map(this.activeKicks);
  }

  /**
   * Clear all kicks (admin only)
   */
  clearAllKicks(): void {
    this.activeKicks.clear();
    console.log('🧹 Cleared all kicks');
  }

  /**
   * Register kick event handler
   */
  onKick(handler: (kick: KickEntry) => void): void {
    this.onKickHandlers.push(handler);
  }

  /**
   * Format duration for display
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  /**
   * Get status
   */
  getStatus(): {
    activeKicks: number;
    config: KickConfig;
  } {
    this.cleanupExpiredKicks();

    return {
      activeKicks: this.activeKicks.size,
      config: this.config,
    };
  }
}
