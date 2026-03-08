import type { Libp2p } from 'libp2p';
import { PeerDiscovery } from '../p2p/peer-discovery';
import { PubSubMessaging } from '../p2p/pubsub-messaging';
import { HostInfo } from './host-election';
import { DataMessage } from './peer-connection';
export interface StarTopologyConfig {
    electionTimeout?: number;
    maxPeers?: number;
    iceServers?: any[];
}
export interface TopologyState {
    accordId: string;
    role: 'host' | 'peer' | 'none';
    hostInfo: HostInfo | null;
    connectedPeers: string[];
    discoveredPeers: string[];
    messageCount: number;
}
export declare class StarTopology {
    private libp2p;
    private discovery;
    private messaging;
    private hostElection;
    private connectionManager;
    private config;
    private accordId;
    private state;
    private messageCount;
    private onMessageHandlers;
    private onHostChangeHandlers;
    private onPeerJoinHandlers;
    private onPeerLeaveHandlers;
    constructor(libp2pInstance: Libp2p, discovery: PeerDiscovery, messaging: PubSubMessaging, config?: StarTopologyConfig);
    joinAccord(accordId: string): Promise<void>;
    leaveAccord(): Promise<void>;
    sendMessage(text: string, from: string): void;
    private handleHostMigration;
    private setupEventHandlers;
    onMessage(handler: (message: DataMessage) => void): void;
    onHostChange(handler: (hostInfo: HostInfo) => void): void;
    onPeerJoin(handler: (peerId: string) => void): void;
    onPeerLeave(handler: (peerId: string) => void): void;
    getState(): TopologyState;
    getStatus(): {
        topology: TopologyState;
        host: any;
        connections: any;
    };
    isHost(): boolean;
    getHost(): HostInfo | null;
    triggerReelection(): Promise<void>;
    private sleep;
}
export declare function createStarTopology(libp2p: Libp2p, discovery: PeerDiscovery, messaging: PubSubMessaging, accordId: string, config?: StarTopologyConfig): Promise<StarTopology>;
//# sourceMappingURL=star-topology.d.ts.map