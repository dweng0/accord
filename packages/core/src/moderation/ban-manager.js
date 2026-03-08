import { signMessage } from 'viem/accounts';
import { verifyMessage } from 'viem';
export class BanManager {
    messaging;
    identityManager;
    metadataUploader;
    accordId = '';
    activeBans = new Map();
    onBanHandlers = [];
    constructor(messaging, identityManager, metadataUploader) {
        this.messaging = messaging;
        this.identityManager = identityManager;
        this.metadataUploader = metadataUploader;
    }
    async initialize(accordId, existingBanList) {
        this.accordId = accordId;
        if (existingBanList) {
            existingBanList.bans.forEach((ban) => {
                this.activeBans.set(ban.address.toLowerCase(), ban);
            });
            console.log(`📥 Loaded ${existingBanList.bans.length} existing ban(s)`);
        }
        await this.messaging.subscribe(accordId, (message) => {
            if (message.type === 'ban') {
                this.handleBanMessage(message);
            }
        });
        console.log(`✅ Ban manager initialized`);
    }
    async banPeer(targetPeerId, reason, signerAccount) {
        const myIdentity = this.identityManager.getMyIdentity();
        if (!myIdentity.address) {
            throw new Error('Must be authenticated to ban peers');
        }
        const targetIdentity = this.identityManager.getPeerIdentity(targetPeerId);
        if (!targetIdentity) {
            throw new Error('Target peer identity unknown');
        }
        const bannedAt = Date.now();
        const messageToSign = this.createBanMessage(targetIdentity.address, reason, bannedAt);
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
        const banEntry = {
            address: targetIdentity.address,
            reason,
            bannedAt,
            bannedBy: myIdentity.address,
            signature,
        };
        this.activeBans.set(targetIdentity.address.toLowerCase(), banEntry);
        const banMessage = {
            type: 'ban',
            targetPeerId,
            targetAddress: targetIdentity.address,
            reason,
            bannedBy: myIdentity.address,
            bannedAt,
            signature,
        };
        await this.messaging.publish(this.accordId, banMessage);
        this.onBanHandlers.forEach((handler) => handler(banEntry));
        console.log(`🚫 Banned ${targetIdentity.address}: ${reason}`);
        return banEntry;
    }
    handleBanMessage(message) {
        const isValid = this.verifyBanSignature(message);
        if (!isValid) {
            console.warn('⚠️  Invalid ban signature, ignoring');
            return;
        }
        const banEntry = {
            address: message.targetAddress,
            reason: message.reason,
            bannedAt: message.bannedAt,
            bannedBy: message.bannedBy,
            signature: message.signature,
        };
        this.activeBans.set(message.targetAddress.toLowerCase(), banEntry);
        this.onBanHandlers.forEach((handler) => handler(banEntry));
        console.log(`📥 Received ban for ${message.targetAddress}: ${message.reason}`);
    }
    verifyBanSignature(message) {
        try {
            const messageToVerify = this.createBanMessage(message.targetAddress, message.reason, message.bannedAt);
            return verifyMessage({
                address: message.bannedBy,
                message: messageToVerify,
                signature: message.signature,
            });
        }
        catch (error) {
            return false;
        }
    }
    createBanMessage(targetAddress, reason, bannedAt) {
        return `BAN PEER
Target: ${targetAddress}
Reason: ${reason}
Banned At: ${new Date(bannedAt).toISOString()}

This action is permanent and will be recorded on IPFS.`;
    }
    isAddressBanned(address) {
        return this.activeBans.has(address.toLowerCase());
    }
    isPeerBanned(peerId) {
        const identity = this.identityManager.getPeerIdentity(peerId);
        if (!identity) {
            return false;
        }
        return this.isAddressBanned(identity.address);
    }
    getBanEntry(address) {
        return this.activeBans.get(address.toLowerCase());
    }
    getAllBans() {
        return Array.from(this.activeBans.values());
    }
    exportBanList() {
        return {
            version: '1.0',
            bans: this.getAllBans(),
        };
    }
    async uploadBanList() {
        if (!this.metadataUploader) {
            throw new Error('Metadata uploader not configured');
        }
        const banList = this.exportBanList();
        const ipfsHash = await this.metadataUploader.uploadBanList(banList);
        console.log(`📤 Uploaded ban list to IPFS: ${ipfsHash}`);
        return ipfsHash;
    }
    unbanAddress(address) {
        const normalizedAddress = address.toLowerCase();
        if (!this.activeBans.has(normalizedAddress)) {
            return false;
        }
        this.activeBans.delete(normalizedAddress);
        console.log(`✅ Unbanned ${address}`);
        return true;
    }
    clearAllBans() {
        this.activeBans.clear();
        console.log('🧹 Cleared all bans');
    }
    onBan(handler) {
        this.onBanHandlers.push(handler);
    }
    getStatus() {
        return {
            totalBans: this.activeBans.size,
            bans: this.getAllBans(),
        };
    }
}
//# sourceMappingURL=ban-manager.js.map