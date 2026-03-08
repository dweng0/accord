import type { Address, Hex } from 'viem';
import type { AdminEntry, AdminList } from '../types';
import { PubSubMessaging } from '../p2p/pubsub-messaging';
import { PeerIdentityManager } from '../auth/peer-identity';
import { MetadataUploader } from '../ipfs/metadata-uploader';
export interface AdminMessage {
    type: 'admin-add' | 'admin-remove';
    targetAddress: Address;
    role: string;
    addedBy: Address;
    addedAt: number;
    signature: Hex;
}
export declare class AdminManager {
    private messaging;
    private identityManager;
    private metadataUploader?;
    private accordId;
    private ownerAddress;
    private admins;
    private onAdminAddHandlers;
    private onAdminRemoveHandlers;
    constructor(messaging: PubSubMessaging, identityManager: PeerIdentityManager, metadataUploader?: MetadataUploader);
    initialize(accordId: string, ownerAddress: Address, existingAdminList?: AdminList): Promise<void>;
    addAdmin(targetAddress: Address, role?: string, signerAccount?: any): Promise<AdminEntry>;
    removeAdmin(targetAddress: Address, signerAccount?: any): Promise<boolean>;
    private handleAdminMessage;
    private verifyAdminSignature;
    private createAdminMessage;
    isAdmin(address: Address): boolean;
    isOwner(address: Address): boolean;
    isAdminOrOwner(address: Address): boolean;
    isPeerAdmin(peerId: string): boolean;
    isPeerOwner(peerId: string): boolean;
    isPeerAdminOrOwner(peerId: string): boolean;
    getAdminEntry(address: Address): AdminEntry | undefined;
    getAllAdmins(): AdminEntry[];
    exportAdminList(): AdminList;
    uploadAdminList(): Promise<string>;
    onAdminAdd(handler: (admin: AdminEntry) => void): void;
    onAdminRemove(handler: (address: Address) => void): void;
    getStatus(): {
        owner: Address | null;
        totalAdmins: number;
        admins: AdminEntry[];
    };
}
//# sourceMappingURL=admin-manager.d.ts.map