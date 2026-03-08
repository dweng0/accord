import { type Address, type Hex } from 'viem';
export interface AuthChallenge {
    message: string;
    nonce: string;
    timestamp: number;
    accordId: string;
}
export interface AuthCredentials {
    address: Address;
    signature: Hex;
    challenge: AuthChallenge;
}
export interface VerifiedIdentity {
    address: Address;
    peerId: string;
    verified: boolean;
    verifiedAt: number;
}
export declare class WalletAuth {
    private challenges;
    private verifiedIdentities;
    createChallenge(accordId: string, peerId: string): AuthChallenge;
    private formatChallengeMessage;
    verifyCredentials(credentials: AuthCredentials, peerId: string): Promise<VerifiedIdentity>;
    getVerifiedIdentity(peerId: string): VerifiedIdentity | undefined;
    isVerified(peerId: string): boolean;
    getAddress(peerId: string): Address | undefined;
    revokeVerification(peerId: string): void;
    getVerifiedPeers(): VerifiedIdentity[];
    private generateNonce;
    clearExpiredChallenges(): void;
    getStatus(): {
        pendingChallenges: number;
        verifiedPeers: number;
        identities: VerifiedIdentity[];
    };
}
export declare function createAuthMessage(accordId: string, peerId: string, nonce: string, timestamp?: number): string;
export declare function verifySignature(message: string, signature: Hex, address: Address): Promise<boolean>;
//# sourceMappingURL=wallet-auth.d.ts.map