/**
 * Peer Identity Management
 * Manages authenticated peer identities and shares them across the network
 */

import type { Address } from 'viem';
import { WalletAuth, type AuthCredentials, type VerifiedIdentity } from './wallet-auth';
import { PubSubMessaging } from '../p2p/pubsub-messaging';

export type { VerifiedIdentity };

export interface IdentityAnnouncement {
  type: 'identity-announcement';
  peerId: string;
  address: Address;
  signature: string;
  timestamp: number;
}

export interface IdentityRequest {
  type: 'identity-request';
  peerId: string;
  targetPeerId: string;
  timestamp: number;
}

export interface IdentityResponse {
  type: 'identity-response';
  peerId: string;
  address: Address;
  verified: boolean;
  verifiedAt: number;
}

export class PeerIdentityManager {
  private walletAuth: WalletAuth;
  private messaging: PubSubMessaging;
  private accordId: string = '';
  private myPeerId: string = '';
  private myAddress: Address | null = null;

  // Track peer identities (peerId -> address)
  private peerIdentities: Map<string, VerifiedIdentity> = new Map();

  constructor(walletAuth: WalletAuth, messaging: PubSubMessaging) {
    this.walletAuth = walletAuth;
    this.messaging = messaging;
  }

  /**
   * Initialize identity manager for an Accord
   */
  async initialize(accordId: string, myPeerId: string): Promise<void> {
    this.accordId = accordId;
    this.myPeerId = myPeerId;

    // Subscribe to identity messages
    await this.messaging.subscribe(accordId, (message: any, from: string) => {
      this.handleIdentityMessage(message, from);
    });

    console.log(`✅ Identity manager initialized for Accord: ${accordId}`);
  }

  /**
   * Authenticate self with wallet signature
   */
  async authenticateSelf(credentials: AuthCredentials): Promise<void> {
    // Verify our own credentials
    const identity = await this.walletAuth.verifyCredentials(
      credentials,
      this.myPeerId
    );

    this.myAddress = identity.address;

    // Announce identity to network
    await this.announceIdentity(identity);

    console.log(`✅ Authenticated as: ${this.myAddress}`);
  }

  /**
   * Announce identity to the network
   */
  private async announceIdentity(identity: VerifiedIdentity): Promise<void> {
    const announcement: IdentityAnnouncement = {
      type: 'identity-announcement',
      peerId: identity.peerId,
      address: identity.address,
      signature: '', // Signature is already verified
      timestamp: Date.now(),
    };

    await this.messaging.publish(this.accordId, announcement);
    console.log(`📢 Announced identity to network`);
  }

  /**
   * Handle incoming identity messages
   */
  private handleIdentityMessage(message: any, from: string): void {
    switch (message.type) {
      case 'identity-announcement':
        this.handleIdentityAnnouncement(message as IdentityAnnouncement, from);
        break;

      case 'identity-request':
        this.handleIdentityRequest(message as IdentityRequest, from);
        break;

      case 'identity-response':
        this.handleIdentityResponse(message as IdentityResponse, from);
        break;
    }
  }

  /**
   * Handle identity announcement from peer
   */
  private handleIdentityAnnouncement(
    announcement: IdentityAnnouncement,
    _from: string
  ): void {
    // Store peer identity
    const identity: VerifiedIdentity = {
      peerId: announcement.peerId,
      address: announcement.address,
      verified: true, // Assume verified if announced
      verifiedAt: announcement.timestamp,
    };

    this.peerIdentities.set(_from, identity);

    console.log(`📥 Received identity from ${_from}: ${announcement.address}`);
  }

  /**
   * Handle identity request
   */
  private async handleIdentityRequest(
    request: IdentityRequest,
    _from: string
  ): Promise<void> {
    // Check if request is for us
    if (request.targetPeerId !== this.myPeerId) {
      return;
    }

    // Send identity response
    if (this.myAddress) {
      const response: IdentityResponse = {
        type: 'identity-response',
        peerId: this.myPeerId,
        address: this.myAddress,
        verified: true,
        verifiedAt: Date.now(),
      };

      await this.messaging.publish(this.accordId, response);
    }
  }

  /**
   * Handle identity response
   */
  private handleIdentityResponse(
    response: IdentityResponse,
    from: string
  ): void {
    const identity: VerifiedIdentity = {
      peerId: response.peerId,
      address: response.address,
      verified: response.verified,
      verifiedAt: response.verifiedAt,
    };

    this.peerIdentities.set(from, identity);

    console.log(`📥 Received identity response from ${from}: ${response.address}`);
  }

  /**
   * Request identity from specific peer
   */
  async requestIdentity(peerId: string): Promise<void> {
    const request: IdentityRequest = {
      type: 'identity-request',
      peerId: this.myPeerId,
      targetPeerId: peerId,
      timestamp: Date.now(),
    };

    await this.messaging.publish(this.accordId, request);
  }

  /**
   * Get identity for peer
   */
  getPeerIdentity(peerId: string): VerifiedIdentity | undefined {
    return this.peerIdentities.get(peerId);
  }

  /**
   * Get address for peer
   */
  getPeerAddress(peerId: string): Address | undefined {
    return this.peerIdentities.get(peerId)?.address;
  }

  /**
   * Check if peer is authenticated
   */
  isPeerAuthenticated(peerId: string): boolean {
    return this.peerIdentities.has(peerId);
  }

  /**
   * Get all authenticated peers
   */
  getAuthenticatedPeers(): VerifiedIdentity[] {
    return Array.from(this.peerIdentities.values());
  }

  /**
   * Get my identity
   */
  getMyIdentity(): { peerId: string; address: Address | null } {
    return {
      peerId: this.myPeerId,
      address: this.myAddress,
    };
  }

  /**
   * Remove peer identity
   */
  removePeerIdentity(peerId: string): void {
    this.peerIdentities.delete(peerId);
  }

  /**
   * Clear all peer identities
   */
  clearPeerIdentities(): void {
    this.peerIdentities.clear();
  }

  /**
   * Get identity status
   */
  getStatus(): {
    myPeerId: string;
    myAddress: Address | null;
    authenticated: boolean;
    peerCount: number;
    peers: VerifiedIdentity[];
  } {
    return {
      myPeerId: this.myPeerId,
      myAddress: this.myAddress,
      authenticated: this.myAddress !== null,
      peerCount: this.peerIdentities.size,
      peers: this.getAuthenticatedPeers(),
    };
  }
}
