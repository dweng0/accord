import { Libp2p } from 'libp2p';
export interface Libp2pNodeConfig {
    bootstrapNodes?: string[];
    enableDHT?: boolean;
    enablePubSub?: boolean;
    announceAddresses?: string[];
}
export declare class Libp2pNode {
    private node;
    private config;
    constructor(config?: Libp2pNodeConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    getNode(): Libp2p;
    getPeerId(): any;
    getMultiaddrs(): string[];
    getConnectedPeers(): string[];
    getPeerCount(): number;
    dialPeer(multiaddr: string): Promise<void>;
    isStarted(): boolean;
    private setupEventListeners;
    getStatus(): {
        started: boolean;
        peerId: string | null;
        peerCount: number;
        addresses: string[];
    };
}
export declare const DEFAULT_BOOTSTRAP_NODES: string[];
export declare function createBasicLibp2pNode(config?: Libp2pNodeConfig): Promise<Libp2pNode>;
//# sourceMappingURL=libp2p-node.d.ts.map