/**
 * Star Topology Coordinator
 * Orchestrates host election, peer connections, and message relay
 */

import type { Libp2p } from 'libp2p';
import { PeerDiscovery } from '../p2p/peer-discovery';
import { PubSubMessaging } from '../p2p/pubsub-messaging';
import { HostElection, HostInfo } from './host-election';
import { PeerConnectionManager, DataMessage } from './peer-connection';

export interface StarTopologyConfig {
  electionTimeout?: number;
  maxPeers?: number;
  iceServers?: any[]; // RTCIceServer[] - using any for compatibility
}

export interface TopologyState {
  accordId: string;
  role: 'host' | 'peer' | 'none';
  hostInfo: HostInfo | null;
  connectedPeers: string[];
  discoveredPeers: string[];
  messageCount: number;
}

export class StarTopology {
  private libp2p: Libp2p;
  private discovery: PeerDiscovery;
  private messaging: PubSubMessaging;
  private hostElection: HostElection;
  private connectionManager: PeerConnectionManager;
  private config: StarTopologyConfig;

  private accordId: string = '';
  private state: TopologyState;
  private messageCount: number = 0;

  // Event handlers
  private onMessageHandlers: Array<(message: DataMessage) => void> = [];
  private onHostChangeHandlers: Array<(hostInfo: HostInfo) => void> = [];
  private onPeerJoinHandlers: Array<(peerId: string) => void> = [];
  private onPeerLeaveHandlers: Array<(peerId: string) => void> = [];

  constructor(
    libp2pInstance: Libp2p,
    discovery: PeerDiscovery,
    messaging: PubSubMessaging,
    config: StarTopologyConfig = {}
  ) {
    this.libp2p = libp2pInstance;
    this.discovery = discovery;
    this.messaging = messaging;
    this.config = {
      electionTimeout: 5000,
      maxPeers: 50,
      ...config,
    };

    this.hostElection = new HostElection(this.libp2p, {
      electionTimeout: this.config.electionTimeout,
    });

    this.connectionManager = new PeerConnectionManager(this.libp2p, messaging, {
      maxPeers: this.config.maxPeers,
      iceServers: this.config.iceServers,
    });

    this.state = {
      accordId: '',
      role: 'none',
      hostInfo: null,
      connectedPeers: [],
      discoveredPeers: [],
      messageCount: 0,
    };

    this.setupEventHandlers();
  }

  /**
   * Join an Accord with star topology
   */
  async joinAccord(accordId: string): Promise<void> {
    this.accordId = accordId;
    this.state.accordId = accordId;

    console.log(`🚀 Joining Accord with star topology: ${accordId}`);

    // 1. Announce presence to DHT
    await this.discovery.announceAccord(accordId);

    // 2. Subscribe to PubSub for coordination
    await this.messaging.subscribe(accordId, (_message: any, _from: string) => {
      // Messages are handled by PeerConnectionManager
    });

    // 3. Wait a moment for DHT propagation
    await this.sleep(2000);

    // 4. Discover peers
    const peers = await this.discovery.findPeers(accordId);
    const peerIds = peers.map((p) => p.peerId);
    this.state.discoveredPeers = peerIds;

    console.log(`Found ${peerIds.length} peer(s)`);

    // 5. Elect host
    const hostInfo = await this.hostElection.electHost(peerIds);
    this.state.hostInfo = hostInfo;

    // Notify handlers
    this.onHostChangeHandlers.forEach((handler) => handler(hostInfo));

    // 6. Initialize WebRTC based on role
    if (this.hostElection.isCurrentHost()) {
      this.state.role = 'host';
      await this.connectionManager.initializeAsHost(accordId);
      console.log('🌟 Initialized as HOST');
    } else {
      this.state.role = 'peer';
      await this.connectionManager.initializeAsPeer(accordId, hostInfo.peerId);
      console.log(`👤 Initialized as PEER, connecting to host: ${hostInfo.peerId}`);
    }

    console.log('✅ Successfully joined Accord');
  }

  /**
   * Leave the current Accord
   */
  async leaveAccord(): Promise<void> {
    console.log(`👋 Leaving Accord: ${this.accordId}`);

    // Disconnect all WebRTC connections
    this.connectionManager.disconnectAll();

    // Unsubscribe from PubSub
    await this.messaging.unsubscribe(this.accordId);

    // Clear state
    this.state = {
      accordId: '',
      role: 'none',
      hostInfo: null,
      connectedPeers: [],
      discoveredPeers: [],
      messageCount: 0,
    };

    this.accordId = '';

    console.log('✅ Left Accord');
  }

  /**
   * Send chat message to Accord
   */
  sendMessage(text: string, from: string): void {
    this.connectionManager.sendChatMessage(text, from);
  }

  /**
   * Handle host migration (when host disconnects)
   */
  private async handleHostMigration(): Promise<void> {
    console.log('⚠️  Host disconnected, initiating migration...');

    // Get remaining peers
    const remainingPeers = this.discovery.getDiscoveredPeers().map((p) => p.peerId);

    // Disconnect all current connections
    this.connectionManager.disconnectAll();

    // Re-elect host
    const newHostInfo = await this.hostElection.reelectHost(remainingPeers);
    this.state.hostInfo = newHostInfo;

    // Notify handlers
    this.onHostChangeHandlers.forEach((handler) => handler(newHostInfo));

    // Re-initialize based on new role
    if (this.hostElection.isCurrentHost()) {
      this.state.role = 'host';
      await this.connectionManager.initializeAsHost(this.accordId);
      console.log('🌟 Became new HOST after migration');
    } else {
      this.state.role = 'peer';
      await this.connectionManager.initializeAsPeer(this.accordId, newHostInfo.peerId);
      console.log(`👤 Reconnecting to new host: ${newHostInfo.peerId}`);
    }
  }

  /**
   * Setup event handlers for connection manager
   */
  private setupEventHandlers(): void {
    // Handle incoming messages
    this.connectionManager.onMessage((message: DataMessage) => {
      this.messageCount++;
      this.state.messageCount = this.messageCount;

      // Forward to registered handlers
      this.onMessageHandlers.forEach((handler) => handler(message));
    });

    // Handle peer connections
    this.connectionManager.onPeerConnected((peerId: string) => {
      this.state.connectedPeers = this.connectionManager.getConnectedPeers();
      this.onPeerJoinHandlers.forEach((handler) => handler(peerId));
    });

    // Handle peer disconnections
    this.connectionManager.onPeerDisconnected((peerId: string) => {
      this.state.connectedPeers = this.connectionManager.getConnectedPeers();
      this.onPeerLeaveHandlers.forEach((handler) => handler(peerId));

      // Check if disconnected peer was the host
      if (this.state.hostInfo && peerId === this.state.hostInfo.peerId) {
        this.handleHostMigration();
      }
    });
  }

  /**
   * Register message handler
   */
  onMessage(handler: (message: DataMessage) => void): void {
    this.onMessageHandlers.push(handler);
  }

  /**
   * Register host change handler
   */
  onHostChange(handler: (hostInfo: HostInfo) => void): void {
    this.onHostChangeHandlers.push(handler);
  }

  /**
   * Register peer join handler
   */
  onPeerJoin(handler: (peerId: string) => void): void {
    this.onPeerJoinHandlers.push(handler);
  }

  /**
   * Register peer leave handler
   */
  onPeerLeave(handler: (peerId: string) => void): void {
    this.onPeerLeaveHandlers.push(handler);
  }

  /**
   * Get current state
   */
  getState(): TopologyState {
    return {
      ...this.state,
      connectedPeers: this.connectionManager.getConnectedPeers(),
    };
  }

  /**
   * Get detailed status
   */
  getStatus(): {
    topology: TopologyState;
    host: any;
    connections: any;
  } {
    return {
      topology: this.getState(),
      host: this.hostElection.getStatus(),
      connections: this.connectionManager.getStatus(),
    };
  }

  /**
   * Check if currently the host
   */
  isHost(): boolean {
    return this.state.role === 'host';
  }

  /**
   * Get current host info
   */
  getHost(): HostInfo | null {
    return this.state.hostInfo;
  }

  /**
   * Manually trigger host re-election (for testing)
   */
  async triggerReelection(): Promise<void> {
    await this.handleHostMigration();
  }

  /**
   * Helper sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Helper to create and initialize star topology
 */
export async function createStarTopology(
  libp2p: Libp2p,
  discovery: PeerDiscovery,
  messaging: PubSubMessaging,
  accordId: string,
  config?: StarTopologyConfig
): Promise<StarTopology> {
  const topology = new StarTopology(libp2p, discovery, messaging, config);
  await topology.joinAccord(accordId);
  return topology;
}
