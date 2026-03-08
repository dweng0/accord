import type { Address } from 'viem';
import { WalletAuth, type AuthCredentials, type VerifiedIdentity } from './wallet-auth';
import { PubSubMessaging } from '../p2p/pubsub-messaging';
export type { VerifiedIdentity };
export interface IdentityAnnouncement {
    type: 'identity-announcement';
    peerId: string;
    address: Address;
    signature: string;
    timestamp: number;
}
export interface IdentityRequest {
    type: 'identity-request';
    peerId: string;
    targetPeerId: string;
    timestamp: number;
}
export interface IdentityResponse {
    type: 'identity-response';
    peerId: string;
    address: Address;
    verified: boolean;
    verifiedAt: number;
}
export declare class PeerIdentityManager {
    private walletAuth;
    private messaging;
    private accordId;
    private myPeerId;
    private myAddress;
    private peerIdentities;
    constructor(walletAuth: WalletAuth, messaging: PubSubMessaging);
    initialize(accordId: string, myPeerId: string): Promise<void>;
    authenticateSelf(credentials: AuthCredentials): Promise<void>;
    private announceIdentity;
    private handleIdentityMessage;
    private handleIdentityAnnouncement;
    private handleIdentityRequest;
    private handleIdentityResponse;
    requestIdentity(peerId: string): Promise<void>;
    getPeerIdentity(peerId: string): VerifiedIdentity | undefined;
    getPeerAddress(peerId: string): Address | undefined;
    isPeerAuthenticated(peerId: string): boolean;
    getAuthenticatedPeers(): VerifiedIdentity[];
    getMyIdentity(): {
        peerId: string;
        address: Address | null;
    };
    removePeerIdentity(peerId: string): void;
    clearPeerIdentities(): void;
    getStatus(): {
        myPeerId: string;
        myAddress: Address | null;
        authenticated: boolean;
        peerCount: number;
        peers: VerifiedIdentity[];
    };
}
//# sourceMappingURL=peer-identity.d.ts.map