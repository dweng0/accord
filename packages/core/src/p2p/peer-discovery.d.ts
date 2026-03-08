import type { Libp2p } from 'libp2p';
import { PeerInfo } from '../types';
export interface DiscoveryConfig {
    timeout?: number;
    maxPeers?: number;
}
export declare class PeerDiscovery {
    private libp2p;
    private config;
    private discoveredPeers;
    constructor(libp2p: Libp2p, config?: DiscoveryConfig);
    announceAccord(accordId: string): Promise<void>;
    findPeers(accordId: string): Promise<PeerInfo[]>;
    getDiscoveredPeers(): PeerInfo[];
    getPeer(peerId: string): PeerInfo | undefined;
    removePeer(peerId: string): void;
    clearPeers(): void;
    private createAccordKey;
    monitorPeers(callback: (event: 'connect' | 'disconnect', peerId: string) => void): void;
    getRoutingTableSize(): number;
    getDHTStatus(): {
        enabled: boolean;
        routingTableSize: number;
        mode: string;
    };
}
export declare function waitForDHT(libp2p: Libp2p, timeout?: number): Promise<void>;
//# sourceMappingURL=peer-discovery.d.ts.map