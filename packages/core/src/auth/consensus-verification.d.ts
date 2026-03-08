import type { Address } from 'viem';
import { PeerIdentityManager } from './peer-identity';
import { PubSubMessaging } from '../p2p/pubsub-messaging';
export interface ConsensusRequest {
    type: 'consensus-request';
    targetPeerId: string;
    targetAddress: Address;
    requesterId: string;
    timestamp: number;
}
export interface ConsensusVote {
    type: 'consensus-vote';
    targetPeerId: string;
    targetAddress: Address;
    voterId: string;
    voterAddress: Address;
    vote: 'approve' | 'reject';
    timestamp: number;
}
export interface ConsensusResult {
    peerId: string;
    address: Address;
    approved: boolean;
    votes: {
        approve: number;
        reject: number;
        total: number;
    };
    voters: string[];
}
export declare class ConsensusVerification {
    private identityManager;
    private messaging;
    private accordId;
    private activeRequests;
    private votes;
    private minVoters;
    private approvalThreshold;
    constructor(identityManager: PeerIdentityManager, messaging: PubSubMessaging, config?: {
        minVoters?: number;
        approvalThreshold?: number;
    });
    initialize(accordId: string): Promise<void>;
    requestConsensus(targetPeerId: string, targetAddress: Address): Promise<void>;
    private handleConsensusMessage;
    private handleConsensusRequest;
    private handleConsensusVote;
    getConsensusResult(peerId: string): ConsensusResult | null;
    waitForConsensus(peerId: string, timeout?: number): Promise<ConsensusResult>;
    clearConsensus(peerId: string): void;
    getActiveRequests(): ConsensusRequest[];
    getStatus(): {
        activeRequests: number;
        totalVotes: number;
        config: {
            minVoters: number;
            approvalThreshold: number;
        };
    };
}
export declare function isConsensusValid(result: ConsensusResult, minVoters?: number, threshold?: number): boolean;
//# sourceMappingURL=consensus-verification.d.ts.map