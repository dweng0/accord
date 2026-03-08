/**
 * Peer Discovery via Kademlia DHT
 * Discovers peers in the same Accord using content routing
 */

import type { Libp2p } from 'libp2p';
import { PeerInfo } from '../types';

export interface DiscoveryConfig {
  timeout?: number;
  maxPeers?: number;
}

export class PeerDiscovery {
  private libp2p: Libp2p;
  private config: DiscoveryConfig;
  private discoveredPeers: Map<string, PeerInfo> = new Map();

  constructor(libp2p: Libp2p, config: DiscoveryConfig = {}) {
    this.libp2p = libp2p;
    this.config = {
      timeout: 30000, // 30 seconds
      maxPeers: 50,
      ...config,
    };
  }

  /**
   * Announce presence in an Accord to the DHT
   */
  async announceAccord(accordId: string): Promise<void> {
    try {
      const key = this.createAccordKey(accordId);
      console.log(`📢 Announcing presence in Accord: ${accordId}`);

      // Provide content to DHT (announce we have this content)
      const dht = this.libp2p.services.dht as any;
      if (!dht) {
        throw new Error('DHT not enabled');
      }

      await dht.provide(key);
      console.log(`✅ Announced to DHT for Accord: ${accordId}`);
    } catch (error: any) {
      throw new Error(`Failed to announce Accord: ${error.message}`);
    }
  }

  /**
   * Find peers in an Accord via DHT
   */
  async findPeers(accordId: string): Promise<PeerInfo[]> {
    try {
      const key = this.createAccordKey(accordId);
      console.log(`🔍 Finding peers for Accord: ${accordId}`);

      const dht = this.libp2p.services.dht as any;
      if (!dht) {
        throw new Error('DHT not enabled');
      }

      const peers: PeerInfo[] = [];
      const myPeerId = this.libp2p.peerId.toString();

      // Find providers of this content
      const providers = await dht.findProviders(key, {
        timeout: this.config.timeout,
      });

      for await (const provider of providers) {
        const peerId = provider.id.toString();

        // Skip ourselves
        if (peerId === myPeerId) {
          continue;
        }

        // Limit number of peers
        if (peers.length >= this.config.maxPeers!) {
          break;
        }

        const peerInfo: PeerInfo = {
          peerId,
          multiaddrs: provider.multiaddrs.map((ma: any) => ma.toString()),
          joinedAt: Date.now(),
        };

        peers.push(peerInfo);
        this.discoveredPeers.set(peerId, peerInfo);

        console.log(`   Found peer: ${peerId}`);
      }

      console.log(`✅ Found ${peers.length} peer(s) for Accord: ${accordId}`);
      return peers;
    } catch (error: any) {
      console.error(`Failed to find peers: ${error.message}`);
      return [];
    }
  }

  /**
   * Get all discovered peers
   */
  getDiscoveredPeers(): PeerInfo[] {
    return Array.from(this.discoveredPeers.values());
  }

  /**
   * Get peer by ID
   */
  getPeer(peerId: string): PeerInfo | undefined {
    return this.discoveredPeers.get(peerId);
  }

  /**
   * Remove peer
   */
  removePeer(peerId: string): void {
    this.discoveredPeers.delete(peerId);
  }

  /**
   * Clear all discovered peers
   */
  clearPeers(): void {
    this.discoveredPeers.clear();
  }

  /**
   * Create DHT key for Accord
   */
  private createAccordKey(accordId: string): Uint8Array {
    // Create a consistent key format for Accord discovery
    const keyString = `accord:${accordId}`;
    return new TextEncoder().encode(keyString);
  }

  /**
   * Monitor peer connections
   */
  monitorPeers(callback: (event: 'connect' | 'disconnect', peerId: string) => void): void {
    this.libp2p.addEventListener('peer:connect', (evt) => {
      callback('connect', evt.detail.toString());
    });

    this.libp2p.addEventListener('peer:disconnect', (evt) => {
      callback('disconnect', evt.detail.toString());
    });
  }

  /**
   * Get DHT routing table size
   */
  getRoutingTableSize(): number {
    const dht = this.libp2p.services.dht as any;
    if (!dht || !dht.routingTable) {
      return 0;
    }
    return dht.routingTable.size || 0;
  }

  /**
   * Get DHT status
   */
  getDHTStatus(): {
    enabled: boolean;
    routingTableSize: number;
    mode: string;
  } {
    const dht = this.libp2p.services.dht as any;

    if (!dht) {
      return {
        enabled: false,
        routingTableSize: 0,
        mode: 'disabled',
      };
    }

    return {
      enabled: true,
      routingTableSize: this.getRoutingTableSize(),
      mode: dht._clientMode ? 'client' : 'server',
    };
  }
}

/**
 * Helper to wait for DHT to be ready
 */
export async function waitForDHT(libp2p: Libp2p, timeout = 10000): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const dht = libp2p.services.dht as any;
    if (dht && dht.isStarted && dht.isStarted()) {
      console.log('✅ DHT is ready');
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error('DHT not ready within timeout');
}
