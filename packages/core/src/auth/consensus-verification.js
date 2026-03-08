export class ConsensusVerification {
    identityManager;
    messaging;
    accordId = '';
    activeRequests = new Map();
    votes = new Map();
    minVoters = 3;
    approvalThreshold = 0.67;
    constructor(identityManager, messaging, config) {
        this.identityManager = identityManager;
        this.messaging = messaging;
        if (config?.minVoters)
            this.minVoters = config.minVoters;
        if (config?.approvalThreshold)
            this.approvalThreshold = config.approvalThreshold;
    }
    async initialize(accordId) {
        this.accordId = accordId;
        await this.messaging.subscribe(accordId, (message, from) => {
            this.handleConsensusMessage(message, from);
        });
        console.log(`✅ Consensus verification initialized`);
    }
    async requestConsensus(targetPeerId, targetAddress) {
        const myIdentity = this.identityManager.getMyIdentity();
        if (!myIdentity.address) {
            throw new Error('Must authenticate before requesting consensus');
        }
        const request = {
            type: 'consensus-request',
            targetPeerId,
            targetAddress,
            requesterId: myIdentity.peerId,
            timestamp: Date.now(),
        };
        this.activeRequests.set(targetPeerId, request);
        await this.messaging.publish(this.accordId, request);
        console.log(`📢 Requested consensus for ${targetPeerId}: ${targetAddress}`);
    }
    handleConsensusMessage(message, from) {
        switch (message.type) {
            case 'consensus-request':
                this.handleConsensusRequest(message, from);
                break;
            case 'consensus-vote':
                this.handleConsensusVote(message, from);
                break;
        }
    }
    async handleConsensusRequest(request, _from) {
        const myIdentity = this.identityManager.getMyIdentity();
        if (!myIdentity.address) {
            return;
        }
        if (request.requesterId === myIdentity.peerId) {
            return;
        }
        const peerIdentity = this.identityManager.getPeerIdentity(request.targetPeerId);
        let vote = 'reject';
        if (peerIdentity) {
            vote =
                peerIdentity.address.toLowerCase() ===
                    request.targetAddress.toLowerCase()
                    ? 'approve'
                    : 'reject';
        }
        else {
            vote = 'reject';
        }
        const consensusVote = {
            type: 'consensus-vote',
            targetPeerId: request.targetPeerId,
            targetAddress: request.targetAddress,
            voterId: myIdentity.peerId,
            voterAddress: myIdentity.address,
            vote,
            timestamp: Date.now(),
        };
        await this.messaging.publish(this.accordId, consensusVote);
        console.log(`🗳️  Voted ${vote} for ${request.targetPeerId}`);
    }
    handleConsensusVote(vote, from) {
        const existingVotes = this.votes.get(vote.targetPeerId) || [];
        existingVotes.push(vote);
        this.votes.set(vote.targetPeerId, existingVotes);
        console.log(`📥 Received ${vote.vote} vote from ${from} for ${vote.targetPeerId}`);
    }
    getConsensusResult(peerId) {
        const request = this.activeRequests.get(peerId);
        if (!request) {
            return null;
        }
        const votes = this.votes.get(peerId) || [];
        const approveVotes = votes.filter((v) => v.vote === 'approve').length;
        const rejectVotes = votes.filter((v) => v.vote === 'reject').length;
        const totalVotes = votes.length;
        const hasEnoughVotes = totalVotes >= this.minVoters;
        const approvalRate = totalVotes > 0 ? approveVotes / totalVotes : 0;
        const approved = hasEnoughVotes && approvalRate >= this.approvalThreshold;
        return {
            peerId,
            address: request.targetAddress,
            approved,
            votes: {
                approve: approveVotes,
                reject: rejectVotes,
                total: totalVotes,
            },
            voters: votes.map((v) => v.voterId),
        };
    }
    async waitForConsensus(peerId, timeout = 10000) {
        const startTime = Date.now();
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                const result = this.getConsensusResult(peerId);
                if (result && result.votes.total >= this.minVoters) {
                    clearInterval(interval);
                    resolve(result);
                }
                if (Date.now() - startTime > timeout) {
                    clearInterval(interval);
                    const currentResult = this.getConsensusResult(peerId);
                    if (currentResult) {
                        resolve(currentResult);
                    }
                    else {
                        reject(new Error('Consensus timeout'));
                    }
                }
            }, 500);
        });
    }
    clearConsensus(peerId) {
        this.activeRequests.delete(peerId);
        this.votes.delete(peerId);
    }
    getActiveRequests() {
        return Array.from(this.activeRequests.values());
    }
    getStatus() {
        let totalVotes = 0;
        this.votes.forEach((votes) => {
            totalVotes += votes.length;
        });
        return {
            activeRequests: this.activeRequests.size,
            totalVotes,
            config: {
                minVoters: this.minVoters,
                approvalThreshold: this.approvalThreshold,
            },
        };
    }
}
export function isConsensusValid(result, minVoters = 3, threshold = 0.67) {
    if (result.votes.total < minVoters) {
        return false;
    }
    const approvalRate = result.votes.approve / result.votes.total;
    return approvalRate >= threshold;
}
//# sourceMappingURL=consensus-verification.js.map