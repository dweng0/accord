/**
 * Wallet Authentication
 * Verify user identity via wallet signatures using viem
 */

import { verifyMessage, type Address, type Hex } from 'viem';

export interface AuthChallenge {
  message: string;
  nonce: string;
  timestamp: number;
  accordId: string;
}

export interface AuthCredentials {
  address: Address;
  signature: Hex;
  challenge: AuthChallenge;
}

export interface VerifiedIdentity {
  address: Address;
  peerId: string;
  verified: boolean;
  verifiedAt: number;
}

export class WalletAuth {
  private challenges: Map<string, AuthChallenge> = new Map();
  private verifiedIdentities: Map<string, VerifiedIdentity> = new Map();

  /**
   * Create authentication challenge
   */
  createChallenge(accordId: string, peerId: string): AuthChallenge {
    const nonce = this.generateNonce();
    const timestamp = Date.now();

    const challenge: AuthChallenge = {
      message: this.formatChallengeMessage(accordId, peerId, nonce, timestamp),
      nonce,
      timestamp,
      accordId,
    };

    // Store challenge for verification
    this.challenges.set(peerId, challenge);

    return challenge;
  }

  /**
   * Format challenge message for signing (EIP-4361 SIWE-style)
   */
  private formatChallengeMessage(
    accordId: string,
    peerId: string,
    nonce: string,
    timestamp: number
  ): string {
    return `Welcome to Accord!

Sign this message to authenticate your identity.

Accord ID: ${accordId}
Peer ID: ${peerId}
Nonce: ${nonce}
Issued At: ${new Date(timestamp).toISOString()}

This request will not trigger a blockchain transaction or cost any gas fees.`;
  }

  /**
   * Verify authentication credentials
   */
  async verifyCredentials(
    credentials: AuthCredentials,
    peerId: string
  ): Promise<VerifiedIdentity> {
    // 1. Check if challenge exists and matches
    const storedChallenge = this.challenges.get(peerId);
    if (!storedChallenge) {
      throw new Error('No challenge found for peer');
    }

    if (storedChallenge.nonce !== credentials.challenge.nonce) {
      throw new Error('Challenge nonce mismatch');
    }

    // 2. Check challenge age (max 5 minutes)
    const age = Date.now() - credentials.challenge.timestamp;
    if (age > 5 * 60 * 1000) {
      throw new Error('Challenge expired');
    }

    // 3. Verify signature using viem
    const isValid = await verifyMessage({
      address: credentials.address,
      message: credentials.challenge.message,
      signature: credentials.signature,
    });

    if (!isValid) {
      throw new Error('Signature verification failed');
    }

    // 4. Create verified identity
    const identity: VerifiedIdentity = {
      address: credentials.address.toLowerCase() as Address,
      peerId,
      verified: true,
      verifiedAt: Date.now(),
    };

    // Store verified identity
    this.verifiedIdentities.set(peerId, identity);

    // Clean up challenge
    this.challenges.delete(peerId);

    console.log(`✅ Verified identity for ${peerId}: ${identity.address}`);

    return identity;
  }

  /**
   * Get verified identity for peer
   */
  getVerifiedIdentity(peerId: string): VerifiedIdentity | undefined {
    return this.verifiedIdentities.get(peerId);
  }

  /**
   * Check if peer is verified
   */
  isVerified(peerId: string): boolean {
    const identity = this.verifiedIdentities.get(peerId);
    return identity?.verified ?? false;
  }

  /**
   * Get wallet address for peer
   */
  getAddress(peerId: string): Address | undefined {
    return this.verifiedIdentities.get(peerId)?.address;
  }

  /**
   * Revoke verification for peer
   */
  revokeVerification(peerId: string): void {
    this.verifiedIdentities.delete(peerId);
    this.challenges.delete(peerId);
  }

  /**
   * Get all verified peers
   */
  getVerifiedPeers(): VerifiedIdentity[] {
    return Array.from(this.verifiedIdentities.values());
  }

  /**
   * Generate random nonce (32 bytes hex)
   */
  private generateNonce(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Clear expired challenges
   */
  clearExpiredChallenges(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    this.challenges.forEach((challenge, peerId) => {
      if (now - challenge.timestamp > maxAge) {
        this.challenges.delete(peerId);
      }
    });
  }

  /**
   * Get authentication status
   */
  getStatus(): {
    pendingChallenges: number;
    verifiedPeers: number;
    identities: VerifiedIdentity[];
  } {
    return {
      pendingChallenges: this.challenges.size,
      verifiedPeers: this.verifiedIdentities.size,
      identities: this.getVerifiedPeers(),
    };
  }
}

/**
 * Helper to create auth message for signing (SIWE-compatible)
 */
export function createAuthMessage(
  accordId: string,
  peerId: string,
  nonce: string,
  timestamp?: number
): string {
  const issued = timestamp || Date.now();
  return `Welcome to Accord!

Sign this message to authenticate.

Accord: ${accordId}
Peer: ${peerId}
Nonce: ${nonce}
Issued: ${new Date(issued).toISOString()}`;
}

/**
 * Helper to verify a signature using viem
 */
export async function verifySignature(
  message: string,
  signature: Hex,
  address: Address
): Promise<boolean> {
  try {
    return await verifyMessage({
      address,
      message,
      signature,
    });
  } catch (error) {
    return false;
  }
}
