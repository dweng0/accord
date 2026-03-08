/**
 * Host Election
 * Determines which peer becomes the host in a star topology
 */

import type { Libp2p } from 'libp2p';

export interface HostElectionConfig {
  electionTimeout?: number;
}

export interface HostInfo {
  peerId: string;
  electedAt: number;
  votes: number;
}

export class HostElection {
  private libp2p: Libp2p;
  private currentHost: HostInfo | null = null;
  private isHost: boolean = false;
  private votes: Map<string, string> = new Map(); // peerId -> votedForPeerId

  constructor(libp2p: Libp2p, _config: HostElectionConfig = {}) {
    this.libp2p = libp2p;
  }

  /**
   * Elect host based on lowest peer ID (deterministic)
   * All peers will agree on the same host
   */
  async electHost(discoveredPeers: string[]): Promise<HostInfo> {
    const myPeerId = this.libp2p.peerId.toString();

    // Add self to peer list
    const allPeers = [...discoveredPeers, myPeerId];

    // Sort peer IDs (lowest becomes host)
    allPeers.sort();

    const hostPeerId = allPeers[0];

    this.isHost = hostPeerId === myPeerId;

    this.currentHost = {
      peerId: hostPeerId,
      electedAt: Date.now(),
      votes: allPeers.length,
    };

    console.log(
      this.isHost
        ? `✅ I am the host! (Peer ID: ${myPeerId})`
        : `📢 Host elected: ${hostPeerId}`
    );

    return this.currentHost;
  }

  /**
   * Vote-based election (alternative method)
   * Each peer votes for the lowest peer ID they know about
   */
  async electHostByVoting(discoveredPeers: string[]): Promise<HostInfo> {
    const myPeerId = this.libp2p.peerId.toString();
    const allPeers = [...discoveredPeers, myPeerId];

    // Clear previous votes
    this.votes.clear();

    // Everyone votes for the lowest peer ID they know
    allPeers.sort();
    const votedPeerId = allPeers[0];

    // Record vote
    this.votes.set(myPeerId, votedPeerId);

    // In a real implementation, peers would exchange votes via PubSub
    // For now, we use deterministic election (same as electHost)

    this.isHost = votedPeerId === myPeerId;

    this.currentHost = {
      peerId: votedPeerId,
      electedAt: Date.now(),
      votes: allPeers.length,
    };

    return this.currentHost;
  }

  /**
   * Check if current peer is the host
   */
  isCurrentHost(): boolean {
    return this.isHost;
  }

  /**
   * Get current host info
   */
  getCurrentHost(): HostInfo | null {
    return this.currentHost;
  }

  /**
   * Re-elect host (e.g., when current host disconnects)
   */
  async reelectHost(remainingPeers: string[]): Promise<HostInfo> {
    console.log('🔄 Re-electing host due to host disconnect...');

    // Remove old host from peer list
    const filteredPeers = remainingPeers.filter(
      (p) => this.currentHost && p !== this.currentHost.peerId
    );

    // Elect new host
    return this.electHost(filteredPeers);
  }

  /**
   * Get host priority (lower = higher priority)
   * Used for deterministic host election
   */
  getHostPriority(peerId: string): number {
    // Simple priority: lexicographic order of peer ID
    // Could be enhanced with:
    // - Peer uptime
    // - Connection quality
    // - Hardware capabilities
    return peerId.charCodeAt(0);
  }

  /**
   * Check if host is still alive
   */
  isHostAlive(connectedPeers: string[]): boolean {
    if (!this.currentHost) {
      return false;
    }

    // If I'm the host, I'm alive
    if (this.isHost) {
      return true;
    }

    // Check if host is in connected peers
    return connectedPeers.includes(this.currentHost.peerId);
  }

  /**
   * Force host change (for testing or manual override)
   */
  setHost(peerId: string): void {
    const myPeerId = this.libp2p.peerId.toString();

    this.currentHost = {
      peerId,
      electedAt: Date.now(),
      votes: 1,
    };

    this.isHost = peerId === myPeerId;

    console.log(
      this.isHost
        ? '✅ Manually set as host'
        : `📢 Host manually set to: ${peerId}`
    );
  }

  /**
   * Clear host state
   */
  clearHost(): void {
    this.currentHost = null;
    this.isHost = false;
    this.votes.clear();
  }

  /**
   * Get election status
   */
  getStatus(): {
    hasHost: boolean;
    isHost: boolean;
    hostInfo: HostInfo | null;
    voteCount: number;
  } {
    return {
      hasHost: this.currentHost !== null,
      isHost: this.isHost,
      hostInfo: this.currentHost,
      voteCount: this.votes.size,
    };
  }
}

/**
 * Helper to determine if peer should become host
 */
export function shouldBecomeHost(
  myPeerId: string,
  discoveredPeers: string[]
): boolean {
  const allPeers = [...discoveredPeers, myPeerId];
  allPeers.sort();
  return allPeers[0] === myPeerId;
}

/**
 * Get next host from peer list (when current host leaves)
 */
export function getNextHost(
  currentHostId: string,
  remainingPeers: string[]
): string | null {
  // Remove current host from list
  const filteredPeers = remainingPeers.filter((p) => p !== currentHostId);

  if (filteredPeers.length === 0) {
    return null;
  }

  // Sort and return lowest peer ID
  filteredPeers.sort();
  return filteredPeers[0];
}
