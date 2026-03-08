import SimplePeer from 'simple-peer';
import type { Libp2p } from 'libp2p';
import { PubSubMessaging } from '../p2p/pubsub-messaging';
export interface PeerConnectionConfig {
    iceServers?: any[];
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
    to?: string;
    payload: any;
    timestamp: number;
}
export declare class PeerConnectionManager {
    private libp2p;
    private messaging;
    private config;
    private connections;
    private isHost;
    private accordId;
    private onMessageHandlers;
    private onPeerConnectedHandlers;
    private onPeerDisconnectedHandlers;
    constructor(libp2p: Libp2p, messaging: PubSubMessaging, config?: PeerConnectionConfig);
    initializeAsHost(accordId: string): Promise<void>;
    initializeAsPeer(accordId: string, hostPeerId: string): Promise<void>;
    connectToPeer(peerId: string, initiator: boolean): Promise<void>;
    private handleSignal;
    private handleDataMessage;
    sendToPeer(peerId: string, message: DataMessage): void;
    broadcast(message: DataMessage, except?: string): void;
    sendChatMessage(text: string, from: string): void;
    private relayMessage;
    disconnectPeer(peerId: string): void;
    disconnectAll(): void;
    getConnectedPeers(): string[];
    getConnectionCount(): number;
    isConnectedTo(peerId: string): boolean;
    onMessage(handler: (message: DataMessage) => void): void;
    onPeerConnected(handler: (peerId: string) => void): void;
    onPeerDisconnected(handler: (peerId: string) => void): void;
    getStatus(): {
        isHost: boolean;
        accordId: string;
        connectionCount: number;
        connections: Array<{
            peerId: string;
            connected: boolean;
            connectedAt?: number;
        }>;
    };
}
//# sourceMappingURL=peer-connection.d.ts.map