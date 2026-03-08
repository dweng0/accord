import type { Address, Hex } from 'viem';
import type { KickEntry } from '../types';
import { PubSubMessaging } from '../p2p/pubsub-messaging';
import { PeerIdentityManager } from '../auth/peer-identity';
export interface KickMessageData {
    type: 'kick';
    targetPeerId: string;
    targetAddress: Address;
    reason: string;
    kickedBy: Address;
    kickedAt: number;
    expiresAt: number;
    signature: Hex;
}
export interface KickConfig {
    defaultDuration?: number;
    maxDuration?: number;
}
export declare class KickManager {
    private messaging;
    private identityManager;
    private accordId;
    private config;
    private activeKicks;
    private onKickHandlers;
    constructor(messaging: PubSubMessaging, identityManager: PeerIdentityManager, config?: KickConfig);
    initialize(accordId: string): Promise<void>;
    kickPeer(targetPeerId: string, reason: string, duration?: number, signerAccount?: any): Promise<KickEntry>;
    private handleKickMessage;
    private verifyKickSignature;
    private createKickMessage;
    isPeerKicked(peerId: string): boolean;
    getKickEntry(peerId: string): KickEntry | undefined;
    getKickTimeRemaining(peerId: string): number;
    private cleanupExpiredKicks;
    private startCleanupTimer;
    getActiveKicks(): Map<string, KickEntry>;
    clearAllKicks(): void;
    onKick(handler: (kick: KickEntry) => void): void;
    private formatDuration;
    getStatus(): {
        activeKicks: number;
        config: KickConfig;
    };
}
//# sourceMappingURL=kick-manager.d.ts.map