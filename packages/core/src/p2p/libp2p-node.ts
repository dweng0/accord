/**
 * libp2p Node Initialization
 * Sets up a libp2p node with DHT, PubSub, and WebSockets
 */

import { createLibp2p, Libp2p } from 'libp2p';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@chainsafe/libp2p-noise';
import { mplex } from '@libp2p/mplex';
import { kadDHT } from '@libp2p/kad-dht';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { bootstrap } from '@libp2p/bootstrap';
import { identify } from '@libp2p/identify';

export interface Libp2pNodeConfig {
  bootstrapNodes?: string[];
  enableDHT?: boolean;
  enablePubSub?: boolean;
  announceAddresses?: string[];
}

export class Libp2pNode {
  private node: Libp2p | null = null;
  private config: Libp2pNodeConfig;

  constructor(config: Libp2pNodeConfig = {}) {
    this.config = {
      enableDHT: true,
      enablePubSub: true,
      ...config,
    };
  }

  /**
   * Initialize and start the libp2p node
   */
  async start(): Promise<void> {
    try {
      console.log('🚀 Initializing libp2p node...');

      // Create libp2p node
      this.node = await createLibp2p({
        addresses: {
          listen: [
            '/ip4/0.0.0.0/tcp/0/ws', // WebSocket
          ],
          announce: this.config.announceAddresses || [],
        },
        transports: [
          webSockets() as any,
        ],
        connectionEncryption: [
          noise(),
        ],
        streamMuxers: [
          mplex(),
        ],
        services: {
          identify: identify() as any,
          ...(this.config.enableDHT && {
            dht: kadDHT({
              clientMode: false,
            }) as any,
          }),
          ...(this.config.enablePubSub && {
            pubsub: gossipsub({
              emitSelf: false,
              allowPublishToZeroPeers: true,
            }) as any,
          }),
          ...(this.config.bootstrapNodes && this.config.bootstrapNodes.length > 0 && {
            bootstrap: bootstrap({
              list: this.config.bootstrapNodes,
            }) as any,
          }),
        } as any,
      });

      // Start the node
      await this.node.start();

      console.log('✅ libp2p node started');
      console.log('   Peer ID:', this.node.peerId.toString());
      console.log('   Addresses:', this.node.getMultiaddrs().map(ma => ma.toString()));

      // Setup event listeners
      this.setupEventListeners();
    } catch (error: any) {
      throw new Error(`Failed to start libp2p node: ${error.message}`);
    }
  }

  /**
   * Stop the libp2p node
   */
  async stop(): Promise<void> {
    if (!this.node) {
      return;
    }

    try {
      await this.node.stop();
      console.log('🛑 libp2p node stopped');
      this.node = null;
    } catch (error: any) {
      throw new Error(`Failed to stop libp2p node: ${error.message}`);
    }
  }

  /**
   * Get the libp2p instance
   */
  getNode(): Libp2p {
    if (!this.node) {
      throw new Error('Node not started. Call start() first.');
    }
    return this.node;
  }

  /**
   * Get peer ID
   */
  getPeerId(): any {
    if (!this.node) {
      throw new Error('Node not started');
    }
    return this.node.peerId;
  }

  /**
   * Get multiaddresses
   */
  getMultiaddrs(): string[] {
    if (!this.node) {
      return [];
    }
    return this.node.getMultiaddrs().map(ma => ma.toString());
  }

  /**
   * Get connected peers
   */
  getConnectedPeers(): string[] {
    if (!this.node) {
      return [];
    }
    return this.node.getPeers().map(peer => peer.toString());
  }

  /**
   * Get peer count
   */
  getPeerCount(): number {
    if (!this.node) {
      return 0;
    }
    return this.node.getPeers().length;
  }

  /**
   * Dial a peer
   */
  async dialPeer(multiaddr: string): Promise<void> {
    if (!this.node) {
      throw new Error('Node not started');
    }

    try {
      await this.node.dial(multiaddr as any);
      console.log(`📞 Dialed peer: ${multiaddr}`);
    } catch (error: any) {
      throw new Error(`Failed to dial peer: ${error.message}`);
    }
  }

  /**
   * Check if node is started
   */
  isStarted(): boolean {
    return this.node !== null;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.node) return;

    // Peer connected
    this.node.addEventListener('peer:connect', (evt) => {
      const peerId = evt.detail.toString();
      console.log(`🤝 Peer connected: ${peerId}`);
    });

    // Peer disconnected
    this.node.addEventListener('peer:disconnect', (evt) => {
      const peerId = evt.detail.toString();
      console.log(`👋 Peer disconnected: ${peerId}`);
    });

    // Peer discovered
    this.node.addEventListener('peer:discovery', (evt) => {
      const peerInfo = evt.detail;
      console.log(`🔍 Peer discovered: ${peerInfo.id.toString()}`);
    });
  }

  /**
   * Get node status
   */
  getStatus(): {
    started: boolean;
    peerId: string | null;
    peerCount: number;
    addresses: string[];
  } {
    if (!this.node) {
      return {
        started: false,
        peerId: null,
        peerCount: 0,
        addresses: [],
      };
    }

    return {
      started: true,
      peerId: this.node.peerId.toString(),
      peerCount: this.getPeerCount(),
      addresses: this.getMultiaddrs(),
    };
  }
}

/**
 * Default bootstrap nodes (public libp2p bootstrap nodes)
 */
export const DEFAULT_BOOTSTRAP_NODES = [
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
  '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
];

/**
 * Helper to create a basic libp2p node
 */
export async function createBasicLibp2pNode(config: Libp2pNodeConfig = {}): Promise<Libp2pNode> {
  const node = new Libp2pNode({
    bootstrapNodes: DEFAULT_BOOTSTRAP_NODES,
    ...config,
  });

  await node.start();
  return node;
}
