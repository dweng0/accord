/**
 * Multi-Peer Consensus Verification
 * Verify peer identities through consensus with multiple peers
 */

import type { Address } from 'viem';
import { PeerIdentityManager } from './peer-identity';
import { PubSubMessaging } from '../p2p/pubsub-messaging';

export interface ConsensusRequest {
  type: 'consensus-request';
  targetPeerId: string;
  targetAddress: Address;
  requesterId: string;
  timestamp: number;
}

export interface ConsensusVote {
  type: 'consensus-vote';
  targetPeerId: string;
  targetAddress: Address;
  voterId: string;
  voterAddress: Address;
  vote: 'approve' | 'reject';
  timestamp: number;
}

export interface ConsensusResult {
  peerId: string;
  address: Address;
  approved: boolean;
  votes: {
    approve: number;
    reject: number;
    total: number;
  };
  voters: string[];
}

export class ConsensusVerification {
  private identityManager: PeerIdentityManager;
  private messaging: PubSubMessaging;
  private accordId: string = '';

  // Track consensus requests and votes
  private activeRequests: Map<string, ConsensusRequest> = new Map();
  private votes: Map<string, ConsensusVote[]> = new Map(); // targetPeerId -> votes

  // Consensus thresholds
  private minVoters: number = 3; // Minimum voters for consensus
  private approvalThreshold: number = 0.67; // 67% approval required

  constructor(
    identityManager: PeerIdentityManager,
    messaging: PubSubMessaging,
    config?: { minVoters?: number; approvalThreshold?: number }
  ) {
    this.identityManager = identityManager;
    this.messaging = messaging;

    if (config?.minVoters) this.minVoters = config.minVoters;
    if (config?.approvalThreshold) this.approvalThreshold = config.approvalThreshold;
  }

  /**
   * Initialize consensus verification
   */
  async initialize(accordId: string): Promise<void> {
    this.accordId = accordId;

    // Subscribe to consensus messages
    await this.messaging.subscribe(accordId, (message: any, from: string) => {
      this.handleConsensusMessage(message, from);
    });

    console.log(`✅ Consensus verification initialized`);
  }

  /**
   * Request consensus verification for a peer
   */
  async requestConsensus(
    targetPeerId: string,
    targetAddress: Address
  ): Promise<void> {
    const myIdentity = this.identityManager.getMyIdentity();

    if (!myIdentity.address) {
      throw new Error('Must authenticate before requesting consensus');
    }

    const request: ConsensusRequest = {
      type: 'consensus-request',
      targetPeerId,
      targetAddress,
      requesterId: myIdentity.peerId,
      timestamp: Date.now(),
    };

    // Store request
    this.activeRequests.set(targetPeerId, request);

    // Broadcast request
    await this.messaging.publish(this.accordId, request);

    console.log(`📢 Requested consensus for ${targetPeerId}: ${targetAddress}`);
  }

  /**
   * Handle consensus messages
   */
  private handleConsensusMessage(message: any, from: string): void {
    switch (message.type) {
      case 'consensus-request':
        this.handleConsensusRequest(message as ConsensusRequest, from);
        break;

      case 'consensus-vote':
        this.handleConsensusVote(message as ConsensusVote, from);
        break;
    }
  }

  /**
   * Handle consensus request
   */
  private async handleConsensusRequest(
    request: ConsensusRequest,
    _from: string
  ): Promise<void> {
    const myIdentity = this.identityManager.getMyIdentity();

    // Skip if we're not authenticated
    if (!myIdentity.address) {
      return;
    }

    // Skip if this is our own request
    if (request.requesterId === myIdentity.peerId) {
      return;
    }

    // Check if we know this peer's identity
    const peerIdentity = this.identityManager.getPeerIdentity(
      request.targetPeerId
    );

    // Determine vote
    let vote: 'approve' | 'reject' = 'reject';

    if (peerIdentity) {
      // We know this peer, check if address matches
      vote =
        peerIdentity.address.toLowerCase() ===
        request.targetAddress.toLowerCase()
          ? 'approve'
          : 'reject';
    } else {
      // We don't know this peer, abstain by rejecting
      vote = 'reject';
    }

    // Send vote
    const consensusVote: ConsensusVote = {
      type: 'consensus-vote',
      targetPeerId: request.targetPeerId,
      targetAddress: request.targetAddress,
      voterId: myIdentity.peerId,
      voterAddress: myIdentity.address,
      vote,
      timestamp: Date.now(),
    };

    await this.messaging.publish(this.accordId, consensusVote);

    console.log(`🗳️  Voted ${vote} for ${request.targetPeerId}`);
  }

  /**
   * Handle consensus vote
   */
  private handleConsensusVote(vote: ConsensusVote, from: string): void {
    // Store vote
    const existingVotes = this.votes.get(vote.targetPeerId) || [];
    existingVotes.push(vote);
    this.votes.set(vote.targetPeerId, existingVotes);

    console.log(
      `📥 Received ${vote.vote} vote from ${from} for ${vote.targetPeerId}`
    );
  }

  /**
   * Get consensus result for a peer
   */
  getConsensusResult(peerId: string): ConsensusResult | null {
    const request = this.activeRequests.get(peerId);
    if (!request) {
      return null;
    }

    const votes = this.votes.get(peerId) || [];

    // Count votes
    const approveVotes = votes.filter((v) => v.vote === 'approve').length;
    const rejectVotes = votes.filter((v) => v.vote === 'reject').length;
    const totalVotes = votes.length;

    // Check if we have enough votes
    const hasEnoughVotes = totalVotes >= this.minVoters;

    // Calculate approval
    const approvalRate = totalVotes > 0 ? approveVotes / totalVotes : 0;
    const approved = hasEnoughVotes && approvalRate >= this.approvalThreshold;

    return {
      peerId,
      address: request.targetAddress,
      approved,
      votes: {
        approve: approveVotes,
        reject: rejectVotes,
        total: totalVotes,
      },
      voters: votes.map((v) => v.voterId),
    };
  }

  /**
   * Wait for consensus result (with timeout)
   */
  async waitForConsensus(
    peerId: string,
    timeout: number = 10000
  ): Promise<ConsensusResult> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const result = this.getConsensusResult(peerId);

        if (result && result.votes.total >= this.minVoters) {
          clearInterval(interval);
          resolve(result);
        }

        if (Date.now() - startTime > timeout) {
          clearInterval(interval);
          const currentResult = this.getConsensusResult(peerId);
          if (currentResult) {
            resolve(currentResult);
          } else {
            reject(new Error('Consensus timeout'));
          }
        }
      }, 500);
    });
  }

  /**
   * Clear consensus data for peer
   */
  clearConsensus(peerId: string): void {
    this.activeRequests.delete(peerId);
    this.votes.delete(peerId);
  }

  /**
   * Get all active consensus requests
   */
  getActiveRequests(): ConsensusRequest[] {
    return Array.from(this.activeRequests.values());
  }

  /**
   * Get status
   */
  getStatus(): {
    activeRequests: number;
    totalVotes: number;
    config: {
      minVoters: number;
      approvalThreshold: number;
    };
  } {
    let totalVotes = 0;
    this.votes.forEach((votes) => {
      totalVotes += votes.length;
    });

    return {
      activeRequests: this.activeRequests.size,
      totalVotes,
      config: {
        minVoters: this.minVoters,
        approvalThreshold: this.approvalThreshold,
      },
    };
  }
}

/**
 * Helper to check if consensus result is valid
 */
export function isConsensusValid(
  result: ConsensusResult,
  minVoters: number = 3,
  threshold: number = 0.67
): boolean {
  if (result.votes.total < minVoters) {
    return false;
  }

  const approvalRate = result.votes.approve / result.votes.total;
  return approvalRate >= threshold;
}
