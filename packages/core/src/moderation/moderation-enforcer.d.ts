import type { Address } from 'viem';
import { KickManager } from './kick-manager';
import { BanManager } from './ban-manager';
import { AdminManager } from './admin-manager';
import { PeerConnectionManager } from '../webrtc/peer-connection';
import { PeerIdentityManager } from '../auth/peer-identity';
import type { BanList, AdminList, KickEntry, BanEntry } from '../types';
export interface ModerationConfig {
    autoEnforce?: boolean;
    requireConsensus?: boolean;
}
export interface ModerationAction {
    type: 'kick' | 'ban' | 'admin-add' | 'admin-remove';
    targetPeerId?: string;
    targetAddress?: Address;
    reason?: string;
    duration?: number;
    role?: string;
    timestamp: number;
}
export declare class ModerationEnforcer {
    private kickManager;
    private banManager;
    private adminManager;
    private connectionManager;
    private identityManager;
    private config;
    private actionLog;
    constructor(kickManager: KickManager, banManager: BanManager, adminManager: AdminManager, connectionManager: PeerConnectionManager, identityManager: PeerIdentityManager, config?: ModerationConfig);
    initialize(accordId: string, ownerAddress: Address, existingBanList?: BanList, existingAdminList?: AdminList): Promise<void>;
    private setupAutoEnforcement;
    private checkPeerOnJoin;
    private enforceKick;
    private enforceBan;
    kickPeer(targetPeerId: string, reason: string, duration?: number, signerAccount?: any): Promise<KickEntry>;
    banPeer(targetPeerId: string, reason: string, signerAccount?: any): Promise<BanEntry>;
    addAdmin(targetAddress: Address, role?: string, signerAccount?: any): Promise<void>;
    removeAdmin(targetAddress: Address, signerAccount?: any): Promise<boolean>;
    canModeratePeer(targetPeerId: string): {
        canKick: boolean;
        canBan: boolean;
        reason?: string;
    };
    private logAction;
    getModerationLog(): ModerationAction[];
    private formatDuration;
    getStatus(): {
        kicks: any;
        bans: any;
        admins: any;
        actionLog: ModerationAction[];
        config: ModerationConfig;
    };
}
//# sourceMappingURL=moderation-enforcer.d.ts.map