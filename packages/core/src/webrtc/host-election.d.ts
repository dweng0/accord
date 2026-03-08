import type { Libp2p } from 'libp2p';
export interface HostElectionConfig {
    electionTimeout?: number;
}
export interface HostInfo {
    peerId: string;
    electedAt: number;
    votes: number;
}
export declare class HostElection {
    private libp2p;
    private currentHost;
    private isHost;
    private votes;
    constructor(libp2p: Libp2p, _config?: HostElectionConfig);
    electHost(discoveredPeers: string[]): Promise<HostInfo>;
    electHostByVoting(discoveredPeers: string[]): Promise<HostInfo>;
    isCurrentHost(): boolean;
    getCurrentHost(): HostInfo | null;
    reelectHost(remainingPeers: string[]): Promise<HostInfo>;
    getHostPriority(peerId: string): number;
    isHostAlive(connectedPeers: string[]): boolean;
    setHost(peerId: string): void;
    clearHost(): void;
    getStatus(): {
        hasHost: boolean;
        isHost: boolean;
        hostInfo: HostInfo | null;
        voteCount: number;
    };
}
export declare function shouldBecomeHost(myPeerId: string, discoveredPeers: string[]): boolean;
export declare function getNextHost(currentHostId: string, remainingPeers: string[]): string | null;
//# sourceMappingURL=host-election.d.ts.map