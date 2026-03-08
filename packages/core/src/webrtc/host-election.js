export class HostElection {
    libp2p;
    currentHost = null;
    isHost = false;
    votes = new Map();
    constructor(libp2p, _config = {}) {
        this.libp2p = libp2p;
    }
    async electHost(discoveredPeers) {
        const myPeerId = this.libp2p.peerId.toString();
        const allPeers = [...discoveredPeers, myPeerId];
        allPeers.sort();
        const hostPeerId = allPeers[0];
        this.isHost = hostPeerId === myPeerId;
        this.currentHost = {
            peerId: hostPeerId,
            electedAt: Date.now(),
            votes: allPeers.length,
        };
        console.log(this.isHost
            ? `✅ I am the host! (Peer ID: ${myPeerId})`
            : `📢 Host elected: ${hostPeerId}`);
        return this.currentHost;
    }
    async electHostByVoting(discoveredPeers) {
        const myPeerId = this.libp2p.peerId.toString();
        const allPeers = [...discoveredPeers, myPeerId];
        this.votes.clear();
        allPeers.sort();
        const votedPeerId = allPeers[0];
        this.votes.set(myPeerId, votedPeerId);
        this.isHost = votedPeerId === myPeerId;
        this.currentHost = {
            peerId: votedPeerId,
            electedAt: Date.now(),
            votes: allPeers.length,
        };
        return this.currentHost;
    }
    isCurrentHost() {
        return this.isHost;
    }
    getCurrentHost() {
        return this.currentHost;
    }
    async reelectHost(remainingPeers) {
        console.log('🔄 Re-electing host due to host disconnect...');
        const filteredPeers = remainingPeers.filter((p) => this.currentHost && p !== this.currentHost.peerId);
        return this.electHost(filteredPeers);
    }
    getHostPriority(peerId) {
        return peerId.charCodeAt(0);
    }
    isHostAlive(connectedPeers) {
        if (!this.currentHost) {
            return false;
        }
        if (this.isHost) {
            return true;
        }
        return connectedPeers.includes(this.currentHost.peerId);
    }
    setHost(peerId) {
        const myPeerId = this.libp2p.peerId.toString();
        this.currentHost = {
            peerId,
            electedAt: Date.now(),
            votes: 1,
        };
        this.isHost = peerId === myPeerId;
        console.log(this.isHost
            ? '✅ Manually set as host'
            : `📢 Host manually set to: ${peerId}`);
    }
    clearHost() {
        this.currentHost = null;
        this.isHost = false;
        this.votes.clear();
    }
    getStatus() {
        return {
            hasHost: this.currentHost !== null,
            isHost: this.isHost,
            hostInfo: this.currentHost,
            voteCount: this.votes.size,
        };
    }
}
export function shouldBecomeHost(myPeerId, discoveredPeers) {
    const allPeers = [...discoveredPeers, myPeerId];
    allPeers.sort();
    return allPeers[0] === myPeerId;
}
export function getNextHost(currentHostId, remainingPeers) {
    const filteredPeers = remainingPeers.filter((p) => p !== currentHostId);
    if (filteredPeers.length === 0) {
        return null;
    }
    filteredPeers.sort();
    return filteredPeers[0];
}
//# sourceMappingURL=host-election.js.map