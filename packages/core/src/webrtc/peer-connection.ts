/**
 * WebRTC Peer Connection Manager
 * Manages WebRTC connections in a star topology
 */

import SimplePeer from 'simple-peer';
import type { Libp2p } from 'libp2p';
import { PubSubMessaging } from '../p2p/pubsub-messaging';

export interface PeerConnectionConfig {
  iceServers?: any[]; // RTCIceServer[] - using any for compatibility
  maxPeers?: number;
}

export interface Connection {
  peerId: string;
  peer: SimplePeer.Instance;
  connected: boolean;
  connectedAt?: number;
}

export interface DataMessage {
  type: 'chat' | 'relay' | 'presence' | 'state';
  from: string;
  to?: string; // For relayed messages
  payload: any;
  timestamp: number;
}

export class PeerConnectionManager {
  private libp2p: Libp2p;
  private messaging: PubSubMessaging;
  private config: PeerConnectionConfig;
  private connections: Map<string, Connection> = new Map();
  private isHost: boolean = false;
  private accordId: string = '';

  // Message handlers
  private onMessageHandlers: Array<(message: DataMessage) => void> = [];
  private onPeerConnectedHandlers: Array<(peerId: string) => void> = [];
  private onPeerDisconnectedHandlers: Array<(peerId: string) => void> = [];

  constructor(
    libp2p: Libp2p,
    messaging: PubSubMessaging,
    config: PeerConnectionConfig = {}
  ) {
    this.libp2p = libp2p;
    this.messaging = messaging;
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      maxPeers: 50,
      ...config,
    };
  }

  /**
   * Initialize as host
   * Host receives connections from all peers
   */
  async initializeAsHost(accordId: string): Promise<void> {
    this.accordId = accordId;
    this.isHost = true;

    console.log('🌟 Initializing as HOST for Accord:', accordId);

    // Listen for WebRTC signaling messages via PubSub
    await this.messaging.subscribe(accordId, (message: any, from: string) => {
      if (message.type === 'webrtc-signal') {
        this.handleSignal(from, message.signal);
      }
    });

    console.log('✅ Host initialized, listening for peer connections');
  }

  /**
   * Initialize as peer
   * Peer connects only to the host
   */
  async initializeAsPeer(accordId: string, hostPeerId: string): Promise<void> {
    this.accordId = accordId;
    this.isHost = false;

    console.log(`👤 Initializing as PEER, connecting to host: ${hostPeerId}`);

    // Listen for WebRTC signaling messages
    await this.messaging.subscribe(accordId, (message: any, from: string) => {
      if (message.type === 'webrtc-signal' && from === hostPeerId) {
        this.handleSignal(from, message.signal);
      }
    });

    // Initiate connection to host
    await this.connectToPeer(hostPeerId, true);

    console.log('✅ Peer initialized, attempting to connect to host');
  }

  /**
   * Connect to a peer via WebRTC
   */
  async connectToPeer(peerId: string, initiator: boolean): Promise<void> {
    if (this.connections.has(peerId)) {
      console.log(`Already connected to ${peerId}`);
      return;
    }

    console.log(
      `${initiator ? '📞 Initiating' : '📱 Accepting'} connection with ${peerId}`
    );

    const peer = new SimplePeer({
      initiator,
      trickle: true,
      config: {
        iceServers: this.config.iceServers,
      },
    });

    // Store connection
    const connection: Connection = {
      peerId,
      peer,
      connected: false,
    };
    this.connections.set(peerId, connection);

    // Handle signaling
    peer.on('signal', (signal: any) => {
      // Send signal via PubSub
      this.messaging.sendSignal(this.accordId, peerId, signal);
    });

    // Handle connection
    peer.on('connect', () => {
      console.log(`✅ Connected to ${peerId}`);
      connection.connected = true;
      connection.connectedAt = Date.now();

      // Notify handlers
      this.onPeerConnectedHandlers.forEach((handler) => handler(peerId));
    });

    // Handle data
    peer.on('data', (data: Uint8Array) => {
      try {
        const message: DataMessage = JSON.parse(data.toString());
        this.handleDataMessage(message, peerId);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    });

    // Handle errors
    peer.on('error', (err: Error) => {
      console.error(`❌ Connection error with ${peerId}:`, err.message);
    });

    // Handle close
    peer.on('close', () => {
      console.log(`👋 Disconnected from ${peerId}`);
      this.connections.delete(peerId);

      // Notify handlers
      this.onPeerDisconnectedHandlers.forEach((handler) => handler(peerId));
    });
  }

  /**
   * Handle incoming WebRTC signal
   */
  private async handleSignal(from: string, signal: any): Promise<void> {
    let connection = this.connections.get(from);

    // If we don't have a connection, create one (we're not the initiator)
    if (!connection) {
      await this.connectToPeer(from, false);
      connection = this.connections.get(from);
    }

    if (connection && connection.peer) {
      try {
        connection.peer.signal(signal);
      } catch (error: any) {
        console.error('Failed to process signal:', error.message);
      }
    }
  }

  /**
   * Handle incoming data message
   */
  private handleDataMessage(message: DataMessage, fromPeerId: string): void {
    // If we're the host and this is a relay message, relay it
    if (this.isHost && message.type === 'relay' && message.to) {
      this.relayMessage(message, fromPeerId);
      return;
    }

    // Otherwise, handle the message
    this.onMessageHandlers.forEach((handler) => handler(message));
  }

  /**
   * Send message to a specific peer
   */
  sendToPeer(peerId: string, message: DataMessage): void {
    const connection = this.connections.get(peerId);

    if (!connection || !connection.connected) {
      console.error(`Cannot send to ${peerId}: not connected`);
      return;
    }

    try {
      const data = JSON.stringify(message);
      connection.peer.send(data);
    } catch (error: any) {
      console.error(`Failed to send to ${peerId}:`, error.message);
    }
  }

  /**
   * Broadcast message to all connected peers
   * (Used by host to relay messages)
   */
  broadcast(message: DataMessage, except?: string): void {
    this.connections.forEach((connection, peerId) => {
      if (except && peerId === except) {
        return; // Skip sender
      }

      if (connection.connected) {
        this.sendToPeer(peerId, message);
      }
    });
  }

  /**
   * Send chat message
   * - If peer: send to host for relay
   * - If host: broadcast to all peers
   */
  sendChatMessage(text: string, from: string): void {
    const myPeerId = this.libp2p.peerId.toString();

    const message: DataMessage = {
      type: 'chat',
      from: myPeerId,
      payload: { text, username: from },
      timestamp: Date.now(),
    };

    if (this.isHost) {
      // Host broadcasts to all peers
      this.broadcast(message);

      // Also handle locally
      this.onMessageHandlers.forEach((handler) => handler(message));
    } else {
      // Peer sends to host for relay
      const hostConnection = Array.from(this.connections.values())[0];
      if (hostConnection) {
        const relayMessage: DataMessage = {
          type: 'relay',
          from: myPeerId,
          payload: message,
          timestamp: Date.now(),
        };
        this.sendToPeer(hostConnection.peerId, relayMessage);
      }
    }
  }

  /**
   * Relay message (host only)
   */
  private relayMessage(message: DataMessage, fromPeerId: string): void {
    if (!this.isHost) {
      console.error('Only host can relay messages');
      return;
    }

    // Extract the actual message from relay payload
    const actualMessage = message.payload as DataMessage;

    // Broadcast to all peers except sender
    this.broadcast(actualMessage, fromPeerId);

    // Also handle locally
    this.onMessageHandlers.forEach((handler) => handler(actualMessage));
  }

  /**
   * Disconnect from a peer
   */
  disconnectPeer(peerId: string): void {
    const connection = this.connections.get(peerId);

    if (connection) {
      connection.peer.destroy();
      this.connections.delete(peerId);
      console.log(`Disconnected from ${peerId}`);
    }
  }

  /**
   * Disconnect from all peers
   */
  disconnectAll(): void {
    console.log('Disconnecting from all peers...');

    this.connections.forEach((connection) => {
      connection.peer.destroy();
    });

    this.connections.clear();
  }

  /**
   * Get all connected peers
   */
  getConnectedPeers(): string[] {
    return Array.from(this.connections.keys()).filter((peerId) => {
      const conn = this.connections.get(peerId);
      return conn?.connected;
    });
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.getConnectedPeers().length;
  }

  /**
   * Check if connected to a peer
   */
  isConnectedTo(peerId: string): boolean {
    const connection = this.connections.get(peerId);
    return connection?.connected ?? false;
  }

  /**
   * Register message handler
   */
  onMessage(handler: (message: DataMessage) => void): void {
    this.onMessageHandlers.push(handler);
  }

  /**
   * Register peer connected handler
   */
  onPeerConnected(handler: (peerId: string) => void): void {
    this.onPeerConnectedHandlers.push(handler);
  }

  /**
   * Register peer disconnected handler
   */
  onPeerDisconnected(handler: (peerId: string) => void): void {
    this.onPeerDisconnectedHandlers.push(handler);
  }

  /**
   * Get connection status
   */
  getStatus(): {
    isHost: boolean;
    accordId: string;
    connectionCount: number;
    connections: Array<{ peerId: string; connected: boolean; connectedAt?: number }>;
  } {
    return {
      isHost: this.isHost,
      accordId: this.accordId,
      connectionCount: this.getConnectionCount(),
      connections: Array.from(this.connections.values()).map((conn) => ({
        peerId: conn.peerId,
        connected: conn.connected,
        connectedAt: conn.connectedAt,
      })),
    };
  }
}
