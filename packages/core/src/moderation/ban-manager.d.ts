import type { Address, Hex } from 'viem';
import type { BanEntry, BanList } from '../types';
import { PubSubMessaging } from '../p2p/pubsub-messaging';
import { PeerIdentityManager } from '../auth/peer-identity';
import { MetadataUploader } from '../ipfs/metadata-uploader';
export interface BanMessage {
    type: 'ban';
    targetPeerId: string;
    targetAddress: Address;
    reason: string;
    bannedBy: Address;
    bannedAt: number;
    signature: Hex;
}
export declare class BanManager {
    private messaging;
    private identityManager;
    private metadataUploader?;
    private accordId;
    private activeBans;
    private onBanHandlers;
    constructor(messaging: PubSubMessaging, identityManager: PeerIdentityManager, metadataUploader?: MetadataUploader);
    initialize(accordId: string, existingBanList?: BanList): Promise<void>;
    banPeer(targetPeerId: string, reason: string, signerAccount?: any): Promise<BanEntry>;
    private handleBanMessage;
    private verifyBanSignature;
    private createBanMessage;
    isAddressBanned(address: Address): boolean;
    isPeerBanned(peerId: string): boolean;
    getBanEntry(address: Address): BanEntry | undefined;
    getAllBans(): BanEntry[];
    exportBanList(): BanList;
    uploadBanList(): Promise<string>;
    unbanAddress(address: Address): boolean;
    clearAllBans(): void;
    onBan(handler: (ban: BanEntry) => void): void;
    getStatus(): {
        totalBans: number;
        bans: BanEntry[];
    };
}
//# sourceMappingURL=ban-manager.d.ts.map