export class ModerationEnforcer {
    kickManager;
    banManager;
    adminManager;
    connectionManager;
    identityManager;
    config;
    actionLog = [];
    constructor(kickManager, banManager, adminManager, connectionManager, identityManager, config = {}) {
        this.kickManager = kickManager;
        this.banManager = banManager;
        this.adminManager = adminManager;
        this.connectionManager = connectionManager;
        this.identityManager = identityManager;
        this.config = {
            autoEnforce: config.autoEnforce ?? true,
            requireConsensus: config.requireConsensus ?? false,
        };
    }
    async initialize(accordId, ownerAddress, existingBanList, existingAdminList) {
        await this.kickManager.initialize(accordId);
        await this.banManager.initialize(accordId, existingBanList);
        await this.adminManager.initialize(accordId, ownerAddress, existingAdminList);
        if (this.config.autoEnforce) {
            this.setupAutoEnforcement();
        }
        console.log(`✅ Moderation enforcer initialized (Auto-enforce: ${this.config.autoEnforce})`);
    }
    setupAutoEnforcement() {
        this.kickManager.onKick((kick) => {
            this.enforceKick(kick);
        });
        this.banManager.onBan((ban) => {
            this.enforceBan(ban);
        });
        this.connectionManager.onPeerConnected((peerId) => {
            this.checkPeerOnJoin(peerId);
        });
    }
    async checkPeerOnJoin(peerId) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const identity = this.identityManager.getPeerIdentity(peerId);
        if (!identity) {
            console.warn(`⚠️  Peer ${peerId} joined without identity`);
            return;
        }
        if (this.banManager.isAddressBanned(identity.address)) {
            const ban = this.banManager.getBanEntry(identity.address);
            console.log(`🚫 Banned peer joined: ${peerId} (${identity.address})`);
            console.log(`   Reason: ${ban.reason}`);
            if (this.config.autoEnforce) {
                this.connectionManager.disconnectPeer(peerId);
                console.log(`⚡ Disconnected banned peer: ${peerId}`);
            }
            return;
        }
        if (this.kickManager.isPeerKicked(peerId)) {
            const kick = this.kickManager.getKickEntry(peerId);
            const remaining = this.kickManager.getKickTimeRemaining(peerId);
            console.log(`⚠️  Kicked peer joined: ${peerId}`);
            console.log(`   Reason: ${kick.reason}`);
            console.log(`   Time remaining: ${this.formatDuration(remaining)}`);
            if (this.config.autoEnforce) {
                this.connectionManager.disconnectPeer(peerId);
                console.log(`⚡ Disconnected kicked peer: ${peerId}`);
            }
        }
    }
    enforceKick(kick) {
        const authenticatedPeers = this.identityManager.getAuthenticatedPeers();
        for (const peer of authenticatedPeers) {
            if (peer.address.toLowerCase() === kick.address.toLowerCase()) {
                console.log(`⚡ Enforcing kick for ${peer.peerId}`);
                if (this.config.autoEnforce) {
                    this.connectionManager.disconnectPeer(peer.peerId);
                }
            }
        }
        this.logAction({
            type: 'kick',
            targetAddress: kick.address,
            reason: kick.reason,
            duration: kick.expiresAt - kick.kickedAt,
            timestamp: kick.kickedAt,
        });
    }
    enforceBan(ban) {
        const authenticatedPeers = this.identityManager.getAuthenticatedPeers();
        for (const peer of authenticatedPeers) {
            if (peer.address.toLowerCase() === ban.address.toLowerCase()) {
                console.log(`⚡ Enforcing ban for ${peer.peerId}`);
                if (this.config.autoEnforce) {
                    this.connectionManager.disconnectPeer(peer.peerId);
                }
            }
        }
        this.logAction({
            type: 'ban',
            targetAddress: ban.address,
            reason: ban.reason,
            timestamp: ban.bannedAt,
        });
    }
    async kickPeer(targetPeerId, reason, duration, signerAccount) {
        const myIdentity = this.identityManager.getMyIdentity();
        if (!myIdentity.address) {
            throw new Error('Must be authenticated to kick peers');
        }
        if (!this.adminManager.isAdminOrOwner(myIdentity.address)) {
            throw new Error('Only admins and owner can kick peers');
        }
        const kick = await this.kickManager.kickPeer(targetPeerId, reason, duration, signerAccount);
        this.logAction({
            type: 'kick',
            targetPeerId,
            targetAddress: this.identityManager.getPeerAddress(targetPeerId),
            reason,
            duration,
            timestamp: Date.now(),
        });
        return kick;
    }
    async banPeer(targetPeerId, reason, signerAccount) {
        const myIdentity = this.identityManager.getMyIdentity();
        if (!myIdentity.address) {
            throw new Error('Must be authenticated to ban peers');
        }
        if (!this.adminManager.isAdminOrOwner(myIdentity.address)) {
            throw new Error('Only admins and owner can ban peers');
        }
        const ban = await this.banManager.banPeer(targetPeerId, reason, signerAccount);
        this.logAction({
            type: 'ban',
            targetPeerId,
            targetAddress: this.identityManager.getPeerAddress(targetPeerId),
            reason,
            timestamp: Date.now(),
        });
        return ban;
    }
    async addAdmin(targetAddress, role = 'moderator', signerAccount) {
        const admin = await this.adminManager.addAdmin(targetAddress, role, signerAccount);
        this.logAction({
            type: 'admin-add',
            targetAddress,
            role,
            timestamp: admin.addedAt,
        });
    }
    async removeAdmin(targetAddress, signerAccount) {
        const removed = await this.adminManager.removeAdmin(targetAddress, signerAccount);
        if (removed) {
            this.logAction({
                type: 'admin-remove',
                targetAddress,
                timestamp: Date.now(),
            });
        }
        return removed;
    }
    canModeratePeer(targetPeerId) {
        const myIdentity = this.identityManager.getMyIdentity();
        const targetIdentity = this.identityManager.getPeerIdentity(targetPeerId);
        if (!myIdentity.address || !targetIdentity) {
            return {
                canKick: false,
                canBan: false,
                reason: 'Not authenticated or target unknown',
            };
        }
        if (!this.adminManager.isAdminOrOwner(myIdentity.address)) {
            return {
                canKick: false,
                canBan: false,
                reason: 'Only admins and owner can moderate',
            };
        }
        if (this.adminManager.isOwner(targetIdentity.address)) {
            return {
                canKick: false,
                canBan: false,
                reason: 'Cannot moderate the owner',
            };
        }
        if (myIdentity.address.toLowerCase() === targetIdentity.address.toLowerCase()) {
            return {
                canKick: false,
                canBan: false,
                reason: 'Cannot moderate yourself',
            };
        }
        return {
            canKick: true,
            canBan: true,
        };
    }
    logAction(action) {
        this.actionLog.push(action);
        if (this.actionLog.length > 100) {
            this.actionLog = this.actionLog.slice(-100);
        }
    }
    getModerationLog() {
        return [...this.actionLog];
    }
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0)
            return `${days}d ${hours % 24}h`;
        if (hours > 0)
            return `${hours}h ${minutes % 60}m`;
        if (minutes > 0)
            return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
    getStatus() {
        return {
            kicks: this.kickManager.getStatus(),
            bans: this.banManager.getStatus(),
            admins: this.adminManager.getStatus(),
            actionLog: this.getModerationLog(),
            config: this.config,
        };
    }
}
//# sourceMappingURL=moderation-enforcer.js.map