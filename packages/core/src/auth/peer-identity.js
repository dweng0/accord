export class PeerIdentityManager {
    walletAuth;
    messaging;
    accordId = '';
    myPeerId = '';
    myAddress = null;
    peerIdentities = new Map();
    constructor(walletAuth, messaging) {
        this.walletAuth = walletAuth;
        this.messaging = messaging;
    }
    async initialize(accordId, myPeerId) {
        this.accordId = accordId;
        this.myPeerId = myPeerId;
        await this.messaging.subscribe(accordId, (message, from) => {
            this.handleIdentityMessage(message, from);
        });
        console.log(`✅ Identity manager initialized for Accord: ${accordId}`);
    }
    async authenticateSelf(credentials) {
        const identity = await this.walletAuth.verifyCredentials(credentials, this.myPeerId);
        this.myAddress = identity.address;
        await this.announceIdentity(identity);
        console.log(`✅ Authenticated as: ${this.myAddress}`);
    }
    async announceIdentity(identity) {
        const announcement = {
            type: 'identity-announcement',
            peerId: identity.peerId,
            address: identity.address,
            signature: '',
            timestamp: Date.now(),
        };
        await this.messaging.publish(this.accordId, announcement);
        console.log(`📢 Announced identity to network`);
    }
    handleIdentityMessage(message, from) {
        switch (message.type) {
            case 'identity-announcement':
                this.handleIdentityAnnouncement(message, from);
                break;
            case 'identity-request':
                this.handleIdentityRequest(message, from);
                break;
            case 'identity-response':
                this.handleIdentityResponse(message, from);
                break;
        }
    }
    handleIdentityAnnouncement(announcement, _from) {
        const identity = {
            peerId: announcement.peerId,
            address: announcement.address,
            verified: true,
            verifiedAt: announcement.timestamp,
        };
        this.peerIdentities.set(_from, identity);
        console.log(`📥 Received identity from ${_from}: ${announcement.address}`);
    }
    async handleIdentityRequest(request, _from) {
        if (request.targetPeerId !== this.myPeerId) {
            return;
        }
        if (this.myAddress) {
            const response = {
                type: 'identity-response',
                peerId: this.myPeerId,
                address: this.myAddress,
                verified: true,
                verifiedAt: Date.now(),
            };
            await this.messaging.publish(this.accordId, response);
        }
    }
    handleIdentityResponse(response, from) {
        const identity = {
            peerId: response.peerId,
            address: response.address,
            verified: response.verified,
            verifiedAt: response.verifiedAt,
        };
        this.peerIdentities.set(from, identity);
        console.log(`📥 Received identity response from ${from}: ${response.address}`);
    }
    async requestIdentity(peerId) {
        const request = {
            type: 'identity-request',
            peerId: this.myPeerId,
            targetPeerId: peerId,
            timestamp: Date.now(),
        };
        await this.messaging.publish(this.accordId, request);
    }
    getPeerIdentity(peerId) {
        return this.peerIdentities.get(peerId);
    }
    getPeerAddress(peerId) {
        return this.peerIdentities.get(peerId)?.address;
    }
    isPeerAuthenticated(peerId) {
        return this.peerIdentities.has(peerId);
    }
    getAuthenticatedPeers() {
        return Array.from(this.peerIdentities.values());
    }
    getMyIdentity() {
        return {
            peerId: this.myPeerId,
            address: this.myAddress,
        };
    }
    removePeerIdentity(peerId) {
        this.peerIdentities.delete(peerId);
    }
    clearPeerIdentities() {
        this.peerIdentities.clear();
    }
    getStatus() {
        return {
            myPeerId: this.myPeerId,
            myAddress: this.myAddress,
            authenticated: this.myAddress !== null,
            peerCount: this.peerIdentities.size,
            peers: this.getAuthenticatedPeers(),
        };
    }
}
//# sourceMappingURL=peer-identity.js.map