/**
 * Moderation Enforcer
 * Coordinates kick/ban/admin systems and enforces moderation policies
 */

import type { Address } from 'viem';
import { KickManager } from './kick-manager';
import { BanManager } from './ban-manager';
import { AdminManager } from './admin-manager';
import { PeerConnectionManager } from '../webrtc/peer-connection';
import { PeerIdentityManager } from '../auth/peer-identity';
import type { BanList, AdminList, KickEntry, BanEntry } from '../types';

export interface ModerationConfig {
  autoEnforce?: boolean; // Automatically disconnect kicked/banned peers
  requireConsensus?: boolean; // Require consensus for bans (future)
}

export interface ModerationAction {
  type: 'kick' | 'ban' | 'admin-add' | 'admin-remove';
  targetPeerId?: string;
  targetAddress?: Address;
  reason?: string;
  duration?: number;
  role?: string;
  timestamp: number;
}

export class ModerationEnforcer {
  private kickManager: KickManager;
  private banManager: BanManager;
  private adminManager: AdminManager;
  private connectionManager: PeerConnectionManager;
  private identityManager: PeerIdentityManager;
  private config: ModerationConfig;

  // Track moderation actions
  private actionLog: ModerationAction[] = [];

  constructor(
    kickManager: KickManager,
    banManager: BanManager,
    adminManager: AdminManager,
    connectionManager: PeerConnectionManager,
    identityManager: PeerIdentityManager,
    config: ModerationConfig = {}
  ) {
    this.kickManager = kickManager;
    this.banManager = banManager;
    this.adminManager = adminManager;
    this.connectionManager = connectionManager;
    this.identityManager = identityManager;
    this.config = {
      autoEnforce: config.autoEnforce ?? true,
      requireConsensus: config.requireConsensus ?? false,
    };
  }

  /**
   * Initialize moderation enforcer
   */
  async initialize(
    accordId: string,
    ownerAddress: Address,
    existingBanList?: BanList,
    existingAdminList?: AdminList
  ): Promise<void> {
    // Initialize managers
    await this.kickManager.initialize(accordId);
    await this.banManager.initialize(accordId, existingBanList);
    await this.adminManager.initialize(accordId, ownerAddress, existingAdminList);

    // Set up enforcement
    if (this.config.autoEnforce) {
      this.setupAutoEnforcement();
    }

    console.log(`✅ Moderation enforcer initialized (Auto-enforce: ${this.config.autoEnforce})`);
  }

  /**
   * Set up automatic enforcement
   */
  private setupAutoEnforcement(): void {
    // Enforce kicks
    this.kickManager.onKick((kick: KickEntry) => {
      this.enforceKick(kick);
    });

    // Enforce bans
    this.banManager.onBan((ban: BanEntry) => {
      this.enforceBan(ban);
    });

    // Monitor peer connections
    this.connectionManager.onPeerConnected((peerId: string) => {
      this.checkPeerOnJoin(peerId);
    });
  }

  /**
   * Check peer when they join
   */
  private async checkPeerOnJoin(peerId: string): Promise<void> {
    // Wait for identity
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const identity = this.identityManager.getPeerIdentity(peerId);

    if (!identity) {
      console.warn(`⚠️  Peer ${peerId} joined without identity`);
      return;
    }

    // Check if banned
    if (this.banManager.isAddressBanned(identity.address)) {
      const ban = this.banManager.getBanEntry(identity.address)!;
      console.log(`🚫 Banned peer joined: ${peerId} (${identity.address})`);
      console.log(`   Reason: ${ban.reason}`);

      if (this.config.autoEnforce) {
        this.connectionManager.disconnectPeer(peerId);
        console.log(`⚡ Disconnected banned peer: ${peerId}`);
      }
      return;
    }

    // Check if kicked
    if (this.kickManager.isPeerKicked(peerId)) {
      const kick = this.kickManager.getKickEntry(peerId)!;
      const remaining = this.kickManager.getKickTimeRemaining(peerId);

      console.log(`⚠️  Kicked peer joined: ${peerId}`);
      console.log(`   Reason: ${kick.reason}`);
      console.log(`   Time remaining: ${this.formatDuration(remaining)}`);

      if (this.config.autoEnforce) {
        this.connectionManager.disconnectPeer(peerId);
        console.log(`⚡ Disconnected kicked peer: ${peerId}`);
      }
    }
  }

  /**
   * Enforce a kick
   */
  private enforceKick(kick: KickEntry): void {
    // Find peer with this address
    const authenticatedPeers = this.identityManager.getAuthenticatedPeers();

    for (const peer of authenticatedPeers) {
      if (peer.address.toLowerCase() === kick.address.toLowerCase()) {
        console.log(`⚡ Enforcing kick for ${peer.peerId}`);

        if (this.config.autoEnforce) {
          this.connectionManager.disconnectPeer(peer.peerId);
        }
      }
    }

    // Log action
    this.logAction({
      type: 'kick',
      targetAddress: kick.address as Address,
      reason: kick.reason,
      duration: kick.expiresAt - kick.kickedAt,
      timestamp: kick.kickedAt,
    });
  }

  /**
   * Enforce a ban
   */
  private enforceBan(ban: BanEntry): void {
    // Find peer with this address
    const authenticatedPeers = this.identityManager.getAuthenticatedPeers();

    for (const peer of authenticatedPeers) {
      if (peer.address.toLowerCase() === ban.address.toLowerCase()) {
        console.log(`⚡ Enforcing ban for ${peer.peerId}`);

        if (this.config.autoEnforce) {
          this.connectionManager.disconnectPeer(peer.peerId);
        }
      }
    }

    // Log action
    this.logAction({
      type: 'ban',
      targetAddress: ban.address as Address,
      reason: ban.reason,
      timestamp: ban.bannedAt,
    });
  }

  /**
   * Kick a peer (checks permissions)
   */
  async kickPeer(
    targetPeerId: string,
    reason: string,
    duration?: number,
    signerAccount?: any
  ): Promise<KickEntry> {
    // Check if caller is admin or owner
    const myIdentity = this.identityManager.getMyIdentity();

    if (!myIdentity.address) {
      throw new Error('Must be authenticated to kick peers');
    }

    if (!this.adminManager.isAdminOrOwner(myIdentity.address)) {
      throw new Error('Only admins and owner can kick peers');
    }

    // Perform kick
    const kick = await this.kickManager.kickPeer(
      targetPeerId,
      reason,
      duration,
      signerAccount
    );

    // Log action
    this.logAction({
      type: 'kick',
      targetPeerId,
      targetAddress: this.identityManager.getPeerAddress(targetPeerId),
      reason,
      duration,
      timestamp: Date.now(),
    });

    return kick;
  }

  /**
   * Ban a peer (checks permissions)
   */
  async banPeer(
    targetPeerId: string,
    reason: string,
    signerAccount?: any
  ): Promise<BanEntry> {
    // Check if caller is admin or owner
    const myIdentity = this.identityManager.getMyIdentity();

    if (!myIdentity.address) {
      throw new Error('Must be authenticated to ban peers');
    }

    if (!this.adminManager.isAdminOrOwner(myIdentity.address)) {
      throw new Error('Only admins and owner can ban peers');
    }

    // Perform ban
    const ban = await this.banManager.banPeer(
      targetPeerId,
      reason,
      signerAccount
    );

    // Log action
    this.logAction({
      type: 'ban',
      targetPeerId,
      targetAddress: this.identityManager.getPeerAddress(targetPeerId),
      reason,
      timestamp: Date.now(),
    });

    return ban;
  }

  /**
   * Add admin (owner only)
   */
  async addAdmin(
    targetAddress: Address,
    role: string = 'moderator',
    signerAccount?: any
  ): Promise<void> {
    const admin = await this.adminManager.addAdmin(
      targetAddress,
      role,
      signerAccount
    );

    // Log action
    this.logAction({
      type: 'admin-add',
      targetAddress,
      role,
      timestamp: admin.addedAt,
    });
  }

  /**
   * Remove admin (owner only)
   */
  async removeAdmin(
    targetAddress: Address,
    signerAccount?: any
  ): Promise<boolean> {
    const removed = await this.adminManager.removeAdmin(
      targetAddress,
      signerAccount
    );

    if (removed) {
      // Log action
      this.logAction({
        type: 'admin-remove',
        targetAddress,
        timestamp: Date.now(),
      });
    }

    return removed;
  }

  /**
   * Check if peer can be moderated
   */
  canModeratePeer(targetPeerId: string): {
    canKick: boolean;
    canBan: boolean;
    reason?: string;
  } {
    const myIdentity = this.identityManager.getMyIdentity();
    const targetIdentity = this.identityManager.getPeerIdentity(targetPeerId);

    // Must be authenticated
    if (!myIdentity.address || !targetIdentity) {
      return {
        canKick: false,
        canBan: false,
        reason: 'Not authenticated or target unknown',
      };
    }

    // Must be admin or owner
    if (!this.adminManager.isAdminOrOwner(myIdentity.address)) {
      return {
        canKick: false,
        canBan: false,
        reason: 'Only admins and owner can moderate',
      };
    }

    // Cannot moderate owner
    if (this.adminManager.isOwner(targetIdentity.address)) {
      return {
        canKick: false,
        canBan: false,
        reason: 'Cannot moderate the owner',
      };
    }

    // Cannot moderate yourself
    if (myIdentity.address.toLowerCase() === targetIdentity.address.toLowerCase()) {
      return {
        canKick: false,
        canBan: false,
        reason: 'Cannot moderate yourself',
      };
    }

    return {
      canKick: true,
      canBan: true,
    };
  }

  /**
   * Log moderation action
   */
  private logAction(action: ModerationAction): void {
    this.actionLog.push(action);

    // Keep last 100 actions
    if (this.actionLog.length > 100) {
      this.actionLog = this.actionLog.slice(-100);
    }
  }

  /**
   * Get moderation log
   */
  getModerationLog(): ModerationAction[] {
    return [...this.actionLog];
  }

  /**
   * Format duration
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Get comprehensive status
   */
  getStatus(): {
    kicks: any;
    bans: any;
    admins: any;
    actionLog: ModerationAction[];
    config: ModerationConfig;
  } {
    return {
      kicks: this.kickManager.getStatus(),
      bans: this.banManager.getStatus(),
      admins: this.adminManager.getStatus(),
      actionLog: this.getModerationLog(),
      config: this.config,
    };
  }
}
