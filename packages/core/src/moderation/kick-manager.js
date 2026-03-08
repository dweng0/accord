import { signMessage } from 'viem/accounts';
import { verifyMessage } from 'viem';
export class KickManager {
    messaging;
    identityManager;
    accordId = '';
    config;
    activeKicks = new Map();
    onKickHandlers = [];
    constructor(messaging, identityManager, config = {}) {
        this.messaging = messaging;
        this.identityManager = identityManager;
        this.config = {
            defaultDuration: config.defaultDuration || 60 * 60 * 1000,
            maxDuration: config.maxDuration || 7 * 24 * 60 * 60 * 1000,
        };
    }
    async initialize(accordId) {
        this.accordId = accordId;
        await this.messaging.subscribe(accordId, (message) => {
            if (message.type === 'kick') {
                this.handleKickMessage(message);
            }
        });
        this.startCleanupTimer();
        console.log(`✅ Kick manager initialized`);
    }
    async kickPeer(targetPeerId, reason, duration, signerAccount) {
        const myIdentity = this.identityManager.getMyIdentity();
        if (!myIdentity.address) {
            throw new Error('Must be authenticated to kick peers');
        }
        const targetIdentity = this.identityManager.getPeerIdentity(targetPeerId);
        if (!targetIdentity) {
            throw new Error('Target peer identity unknown');
        }
        const kickedAt = Date.now();
        const kickDuration = duration || this.config.defaultDuration;
        const finalDuration = Math.min(kickDuration, this.config.maxDuration);
        const expiresAt = kickedAt + finalDuration;
        const messageToSign = this.createKickMessage(targetIdentity.address, reason, kickedAt, expiresAt);
        let signature;
        if (signerAccount) {
            signature = await signMessage({
                message: messageToSign,
                privateKey: signerAccount.privateKey,
            });
        }
        else {
            signature = '0x';
        }
        const kickEntry = {
            address: targetIdentity.address,
            reason,
            kickedAt,
            kickedBy: myIdentity.address,
            expiresAt,
            signature,
        };
        this.activeKicks.set(targetPeerId, kickEntry);
        const kickMessage = {
            type: 'kick',
            targetPeerId,
            targetAddress: targetIdentity.address,
            reason,
            kickedBy: myIdentity.address,
            kickedAt,
            expiresAt,
            signature,
        };
        await this.messaging.publish(this.accordId, kickMessage);
        this.onKickHandlers.forEach((handler) => handler(kickEntry));
        console.log(`⚠️  Kicked ${targetPeerId} for ${this.formatDuration(finalDuration)}: ${reason}`);
        return kickEntry;
    }
    handleKickMessage(message) {
        const isValid = this.verifyKickSignature(message);
        if (!isValid) {
            console.warn('⚠️  Invalid kick signature, ignoring');
            return;
        }
        const kickEntry = {
            address: message.targetAddress,
            reason: message.reason,
            kickedAt: message.kickedAt,
            kickedBy: message.kickedBy,
            expiresAt: message.expiresAt,
            signature: message.signature,
        };
        this.activeKicks.set(message.targetPeerId, kickEntry);
        this.onKickHandlers.forEach((handler) => handler(kickEntry));
        console.log(`📥 Received kick for ${message.targetPeerId}: ${message.reason}`);
    }
    verifyKickSignature(message) {
        try {
            const messageToVerify = this.createKickMessage(message.targetAddress, message.reason, message.kickedAt, message.expiresAt);
            return verifyMessage({
                address: message.kickedBy,
                message: messageToVerify,
                signature: message.signature,
            });
        }
        catch (error) {
            return false;
        }
    }
    createKickMessage(targetAddress, reason, kickedAt, expiresAt) {
        return `KICK PEER
Target: ${targetAddress}
Reason: ${reason}
Kicked At: ${new Date(kickedAt).toISOString()}
Expires At: ${new Date(expiresAt).toISOString()}`;
    }
    isPeerKicked(peerId) {
        const kick = this.activeKicks.get(peerId);
        if (!kick) {
            return false;
        }
        if (Date.now() > kick.expiresAt) {
            this.activeKicks.delete(peerId);
            return false;
        }
        return true;
    }
    getKickEntry(peerId) {
        const kick = this.activeKicks.get(peerId);
        if (!kick) {
            return undefined;
        }
        if (Date.now() > kick.expiresAt) {
            this.activeKicks.delete(peerId);
            return undefined;
        }
        return kick;
    }
    getKickTimeRemaining(peerId) {
        const kick = this.activeKicks.get(peerId);
        if (!kick) {
            return 0;
        }
        const remaining = kick.expiresAt - Date.now();
        return Math.max(0, remaining);
    }
    cleanupExpiredKicks() {
        const now = Date.now();
        let cleaned = 0;
        this.activeKicks.forEach((kick, peerId) => {
            if (now > kick.expiresAt) {
                this.activeKicks.delete(peerId);
                cleaned++;
            }
        });
        if (cleaned > 0) {
            console.log(`🧹 Cleaned up ${cleaned} expired kick(s)`);
        }
    }
    startCleanupTimer() {
        setInterval(() => {
            this.cleanupExpiredKicks();
        }, 60 * 1000);
    }
    getActiveKicks() {
        this.cleanupExpiredKicks();
        return new Map(this.activeKicks);
    }
    clearAllKicks() {
        this.activeKicks.clear();
        console.log('🧹 Cleared all kicks');
    }
    onKick(handler) {
        this.onKickHandlers.push(handler);
    }
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0)
            return `${days}d`;
        if (hours > 0)
            return `${hours}h`;
        if (minutes > 0)
            return `${minutes}m`;
        return `${seconds}s`;
    }
    getStatus() {
        this.cleanupExpiredKicks();
        return {
            activeKicks: this.activeKicks.size,
            config: this.config,
        };
    }
}
//# sourceMappingURL=kick-manager.js.map