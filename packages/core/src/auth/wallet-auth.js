import { verifyMessage } from 'viem';
export class WalletAuth {
    challenges = new Map();
    verifiedIdentities = new Map();
    createChallenge(accordId, peerId) {
        const nonce = this.generateNonce();
        const timestamp = Date.now();
        const challenge = {
            message: this.formatChallengeMessage(accordId, peerId, nonce, timestamp),
            nonce,
            timestamp,
            accordId,
        };
        this.challenges.set(peerId, challenge);
        return challenge;
    }
    formatChallengeMessage(accordId, peerId, nonce, timestamp) {
        return `Welcome to Accord!

Sign this message to authenticate your identity.

Accord ID: ${accordId}
Peer ID: ${peerId}
Nonce: ${nonce}
Issued At: ${new Date(timestamp).toISOString()}

This request will not trigger a blockchain transaction or cost any gas fees.`;
    }
    async verifyCredentials(credentials, peerId) {
        const storedChallenge = this.challenges.get(peerId);
        if (!storedChallenge) {
            throw new Error('No challenge found for peer');
        }
        if (storedChallenge.nonce !== credentials.challenge.nonce) {
            throw new Error('Challenge nonce mismatch');
        }
        const age = Date.now() - credentials.challenge.timestamp;
        if (age > 5 * 60 * 1000) {
            throw new Error('Challenge expired');
        }
        const isValid = await verifyMessage({
            address: credentials.address,
            message: credentials.challenge.message,
            signature: credentials.signature,
        });
        if (!isValid) {
            throw new Error('Signature verification failed');
        }
        const identity = {
            address: credentials.address.toLowerCase(),
            peerId,
            verified: true,
            verifiedAt: Date.now(),
        };
        this.verifiedIdentities.set(peerId, identity);
        this.challenges.delete(peerId);
        console.log(`✅ Verified identity for ${peerId}: ${identity.address}`);
        return identity;
    }
    getVerifiedIdentity(peerId) {
        return this.verifiedIdentities.get(peerId);
    }
    isVerified(peerId) {
        const identity = this.verifiedIdentities.get(peerId);
        return identity?.verified ?? false;
    }
    getAddress(peerId) {
        return this.verifiedIdentities.get(peerId)?.address;
    }
    revokeVerification(peerId) {
        this.verifiedIdentities.delete(peerId);
        this.challenges.delete(peerId);
    }
    getVerifiedPeers() {
        return Array.from(this.verifiedIdentities.values());
    }
    generateNonce() {
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        return Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    }
    clearExpiredChallenges() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000;
        this.challenges.forEach((challenge, peerId) => {
            if (now - challenge.timestamp > maxAge) {
                this.challenges.delete(peerId);
            }
        });
    }
    getStatus() {
        return {
            pendingChallenges: this.challenges.size,
            verifiedPeers: this.verifiedIdentities.size,
            identities: this.getVerifiedPeers(),
        };
    }
}
export function createAuthMessage(accordId, peerId, nonce, timestamp) {
    const issued = timestamp || Date.now();
    return `Welcome to Accord!

Sign this message to authenticate.

Accord: ${accordId}
Peer: ${peerId}
Nonce: ${nonce}
Issued: ${new Date(issued).toISOString()}`;
}
export async function verifySignature(message, signature, address) {
    try {
        return await verifyMessage({
            address,
            message,
            signature,
        });
    }
    catch (error) {
        return false;
    }
}
//# sourceMappingURL=wallet-auth.js.map