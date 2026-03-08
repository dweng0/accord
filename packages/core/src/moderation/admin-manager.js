import { signMessage } from 'viem/accounts';
import { verifyMessage } from 'viem';
export class AdminManager {
    messaging;
    identityManager;
    metadataUploader;
    accordId = '';
    ownerAddress = null;
    admins = new Map();
    onAdminAddHandlers = [];
    onAdminRemoveHandlers = [];
    constructor(messaging, identityManager, metadataUploader) {
        this.messaging = messaging;
        this.identityManager = identityManager;
        this.metadataUploader = metadataUploader;
    }
    async initialize(accordId, ownerAddress, existingAdminList) {
        this.accordId = accordId;
        this.ownerAddress = ownerAddress.toLowerCase();
        if (existingAdminList) {
            existingAdminList.admins.forEach((admin) => {
                this.admins.set(admin.address.toLowerCase(), admin);
            });
            console.log(`📥 Loaded ${existingAdminList.admins.length} existing admin(s)`);
        }
        await this.messaging.subscribe(accordId, (message) => {
            if (message.type === 'admin-add' || message.type === 'admin-remove') {
                this.handleAdminMessage(message);
            }
        });
        console.log(`✅ Admin manager initialized (Owner: ${this.ownerAddress})`);
    }
    async addAdmin(targetAddress, role = 'moderator', signerAccount) {
        const myIdentity = this.identityManager.getMyIdentity();
        if (!myIdentity.address) {
            throw new Error('Must be authenticated to add admins');
        }
        if (myIdentity.address.toLowerCase() !== this.ownerAddress?.toLowerCase()) {
            throw new Error('Only owner can add admins');
        }
        const addedAt = Date.now();
        const messageToSign = this.createAdminMessage('add', targetAddress, role, addedAt);
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
        const adminEntry = {
            address: targetAddress.toLowerCase(),
            addedAt,
            addedBy: myIdentity.address,
            signature,
            role,
        };
        this.admins.set(targetAddress.toLowerCase(), adminEntry);
        const adminMessage = {
            type: 'admin-add',
            targetAddress,
            role,
            addedBy: myIdentity.address,
            addedAt,
            signature,
        };
        await this.messaging.publish(this.accordId, adminMessage);
        this.onAdminAddHandlers.forEach((handler) => handler(adminEntry));
        console.log(`✅ Added admin: ${targetAddress} (${role})`);
        return adminEntry;
    }
    async removeAdmin(targetAddress, signerAccount) {
        const myIdentity = this.identityManager.getMyIdentity();
        if (!myIdentity.address) {
            throw new Error('Must be authenticated to remove admins');
        }
        if (myIdentity.address.toLowerCase() !== this.ownerAddress?.toLowerCase()) {
            throw new Error('Only owner can remove admins');
        }
        const normalizedAddress = targetAddress.toLowerCase();
        if (!this.admins.has(normalizedAddress)) {
            return false;
        }
        const messageToSign = this.createAdminMessage('remove', targetAddress, '', Date.now());
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
        this.admins.delete(normalizedAddress);
        const adminMessage = {
            type: 'admin-remove',
            targetAddress,
            role: '',
            addedBy: myIdentity.address,
            addedAt: Date.now(),
            signature,
        };
        await this.messaging.publish(this.accordId, adminMessage);
        this.onAdminRemoveHandlers.forEach((handler) => handler(normalizedAddress));
        console.log(`❌ Removed admin: ${targetAddress}`);
        return true;
    }
    handleAdminMessage(message) {
        const isValid = this.verifyAdminSignature(message);
        if (!isValid) {
            console.warn('⚠️  Invalid admin signature, ignoring');
            return;
        }
        if (message.addedBy.toLowerCase() !== this.ownerAddress?.toLowerCase()) {
            console.warn('⚠️  Admin message from non-owner, ignoring');
            return;
        }
        const normalizedAddress = message.targetAddress.toLowerCase();
        if (message.type === 'admin-add') {
            const adminEntry = {
                address: normalizedAddress,
                addedAt: message.addedAt,
                addedBy: message.addedBy,
                signature: message.signature,
                role: message.role,
            };
            this.admins.set(normalizedAddress, adminEntry);
            this.onAdminAddHandlers.forEach((handler) => handler(adminEntry));
            console.log(`📥 Added admin: ${normalizedAddress} (${message.role})`);
        }
        else if (message.type === 'admin-remove') {
            this.admins.delete(normalizedAddress);
            this.onAdminRemoveHandlers.forEach((handler) => handler(normalizedAddress));
            console.log(`📥 Removed admin: ${normalizedAddress}`);
        }
    }
    verifyAdminSignature(message) {
        try {
            const action = message.type === 'admin-add' ? 'add' : 'remove';
            const messageToVerify = this.createAdminMessage(action, message.targetAddress, message.role, message.addedAt);
            return verifyMessage({
                address: message.addedBy,
                message: messageToVerify,
                signature: message.signature,
            });
        }
        catch (error) {
            return false;
        }
    }
    createAdminMessage(action, targetAddress, role, timestamp) {
        if (action === 'add') {
            return `ADD ADMIN
Target: ${targetAddress}
Role: ${role}
Timestamp: ${new Date(timestamp).toISOString()}`;
        }
        else {
            return `REMOVE ADMIN
Target: ${targetAddress}
Timestamp: ${new Date(timestamp).toISOString()}`;
        }
    }
    isAdmin(address) {
        return this.admins.has(address.toLowerCase());
    }
    isOwner(address) {
        return address.toLowerCase() === this.ownerAddress?.toLowerCase();
    }
    isAdminOrOwner(address) {
        return this.isOwner(address) || this.isAdmin(address);
    }
    isPeerAdmin(peerId) {
        const identity = this.identityManager.getPeerIdentity(peerId);
        if (!identity) {
            return false;
        }
        return this.isAdmin(identity.address);
    }
    isPeerOwner(peerId) {
        const identity = this.identityManager.getPeerIdentity(peerId);
        if (!identity) {
            return false;
        }
        return this.isOwner(identity.address);
    }
    isPeerAdminOrOwner(peerId) {
        return this.isPeerOwner(peerId) || this.isPeerAdmin(peerId);
    }
    getAdminEntry(address) {
        return this.admins.get(address.toLowerCase());
    }
    getAllAdmins() {
        return Array.from(this.admins.values());
    }
    exportAdminList() {
        return {
            version: '1.0',
            admins: this.getAllAdmins(),
        };
    }
    async uploadAdminList() {
        if (!this.metadataUploader) {
            throw new Error('Metadata uploader not configured');
        }
        const adminList = this.exportAdminList();
        const ipfsHash = await this.metadataUploader.uploadAdminList(adminList);
        console.log(`📤 Uploaded admin list to IPFS: ${ipfsHash}`);
        return ipfsHash;
    }
    onAdminAdd(handler) {
        this.onAdminAddHandlers.push(handler);
    }
    onAdminRemove(handler) {
        this.onAdminRemoveHandlers.push(handler);
    }
    getStatus() {
        return {
            owner: this.ownerAddress,
            totalAdmins: this.admins.size,
            admins: this.getAllAdmins(),
        };
    }
}
//# sourceMappingURL=admin-manager.js.map